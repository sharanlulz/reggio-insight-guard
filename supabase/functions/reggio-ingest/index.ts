// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// -------- ENV --------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.1-70b-versatile";

// -------- CLIENTS --------
// NOTE: default schema is 'public'. We must scope to 'reggio'.
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// All reads/writes go through the reggio schema client:
const db = sb.schema("reggio");

// -------- TYPES --------
type IngestPayload = {
  regulationId: string;
  source_url?: string;
  document: {
    versionLabel: string;
    docType: "Regulation" | "Guidance";
    language: string;
    source_url?: string;
    published_at?: string;
  };
  chunks?: Array<{
    path_hierarchy: string;
    number_label?: string | null;
    text_raw: string;
  }>;
};

const OBLIGATION_TYPES = [
  "MANDATORY","RECOMMENDED","REPORTING","DISCLOSURE",
  "RESTRICTION","GOVERNANCE","RISK_MANAGEMENT","RECORD_KEEPING",
] as const;

const RISK_AREAS = [
  "LIQUIDITY","CAPITAL","MARKET","CREDIT","OPERATIONAL","CONDUCT",
  "AML_CFT","DATA_PRIVACY","TECH_RISK","OUTSOURCING","IRRBB","RRP",
] as const;

// -------- HELPERS --------
async function fetchAndChunk(url: string): Promise<IngestPayload["chunks"]> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const max = 2000;
  const chunks: IngestPayload["chunks"] = [];
  let i = 0, idx = 0;
  while (i < text.length) {
    chunks.push({
      path_hierarchy: `Section ${++idx}`,
      text_raw: text.slice(i, i + max),
      number_label: null,
    });
    i += max;
  }
  return chunks;
}

function groqSystem() {
  return `
Return ONLY JSON with keys:
summary_plain (<=120 words), obligation_type one of ${JSON.stringify(OBLIGATION_TYPES)},
risk_area one of ${JSON.stringify(RISK_AREAS)},
themes (2-6 strings), industries (0-5 strings),
obligations (array of {description, due_date_estimate, related_clause_path}).
If unknown, use "" or [].
  `;
}

async function analyzeChunk(text_raw: string, path: string) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: groqSystem() },
        { role: "user", content: JSON.stringify({ clause_text: text_raw, related_clause_path: path }) },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!r.ok) throw new Error(`Groq error ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}$/);
    return m ? JSON.parse(m[0]) : {};
  }
}

async function upsertDocAndClauses(payload: IngestPayload) {
  const { regulationId, document } = payload;

  // 1) Insert a regulation document (reggio schema!)
  const { data: docIns, error: docErr } = await db
    .from("regulation_documents")
    .insert({
      regulation_id: regulationId,
      version_label: document.versionLabel,
      doc_type: document.docType,
      language: document.language,
      source_url: document.source_url ?? payload.source_url ?? null,
      published_at: document.published_at ?? null,
    })
    .select("id")
    .single();
  if (docErr) throw docErr;
  const document_id = docIns.id;

  // 2) Each chunk → analyze → insert clause + obligations
  for (const c of payload.chunks!) {
    const ai = await analyzeChunk(c.text_raw, c.path_hierarchy);

    const { data: clauseRow, error: clauseErr } = await db
      .from("clauses")
      .insert({
        // Some scaffolds keep both regulation_id and document_id — we set both if present.
        regulation_id: regulationId,
        document_id,
        path_hierarchy: c.path_hierarchy,
        number_label: c.number_label ?? null,
        text_raw: c.text_raw,
        summary_plain: ai.summary_plain ?? null,
        obligation_type: ai.obligation_type ?? null,
        risk_area: ai.risk_area ?? null,
        themes: ai.themes ?? [],
        industries: ai.industries ?? [],
      })
      .select("id, path_hierarchy")
      .single();
    if (clauseErr) throw clauseErr;

    const obligations = Array.isArray(ai.obligations) ? ai.obligations : [];
    if (obligations.length) {
      const rows = obligations.map((o: any) => ({
        clause_id: clauseRow.id,
        description: o.description ?? "",
        due_date_estimate: o.due_date_estimate ?? null,
        related_clause_path: o.related_clause_path ?? clauseRow.path_hierarchy,
      }));
      const { error: oblErr } = await db.from("obligations").insert(rows);
      if (oblErr) throw oblErr;
    }
  }

  return { regulation_document_id: document_id };
}

// -------- HTTP --------
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const payload = (await req.json()) as IngestPayload;

    if (!payload.regulationId) {
      return new Response(JSON.stringify({ error: "regulationId required" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (payload.source_url && (!payload.chunks || payload.chunks.length === 0)) {
      payload.chunks = await fetchAndChunk(payload.source_url);
      if (!payload.document.source_url) payload.document.source_url = payload.source_url;
    }
    if (!payload.chunks || payload.chunks.length === 0) {
      return new Response(JSON.stringify({ error: "No chunks provided/resolved" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    const result = await upsertDocAndClauses(payload);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 500,
    });
  }
});
