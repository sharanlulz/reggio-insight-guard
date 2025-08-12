import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.1-70b-versatile";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function chunkText(text: string, size = 2000) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function callGroqForChunk(text_raw: string, related_clause_path?: string) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in Supabase secrets");
  }

  const system = `You are an expert regulatory analyst. Read the provided regulation text and output STRICT JSON with the keys and enums below. Do not include any extra keys or prose. Keep summary_plain <= 120 words.
Keys:
- summary_plain: string
- obligation_type: one of [MANDATORY, RECOMMENDED, REPORTING, DISCLOSURE, RESTRICTION, GOVERNANCE, RISK_MANAGEMENT, RECORD_KEEPING]
- risk_area: one of [LIQUIDITY, CAPITAL, MARKET, CREDIT, OPERATIONAL, CONDUCT, AML_CFT, DATA_PRIVACY, TECH_RISK, OUTSOURCING, IRRBB, RRP]
- themes: array of 2-6 short tags
- industries: array of 0-5 industry tags
- obligations: array of { description: string, due_date_estimate: string|null, related_clause_path: string|null }
`;

  const body = {
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: text_raw },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error("Groq returned non-JSON content");
  }
  if (parsed && parsed.obligations && Array.isArray(parsed.obligations)) {
    parsed.obligations = parsed.obligations.map((o: any) => ({
      description: o.description ?? null,
      due_date_estimate: o.due_date_estimate ?? null,
      related_clause_path: o.related_clause_path ?? related_clause_path ?? null,
    }));
  }
  return parsed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { regulationId, source_url, document, chunks } = payload as {
      regulationId: string;
      source_url?: string;
      document?: {
        versionLabel?: string;
        docType?: string;
        language?: string;
        source_url?: string;
        published_at?: string;
      };
      chunks?: Array<{
        path_hierarchy?: string;
        number_label?: string;
        text_raw: string;
      }>;
    };

    if (!regulationId) {
      return new Response(JSON.stringify({ error: "regulationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare document
    let finalDoc = {
      version_label: document?.versionLabel ?? "v1",
      doc_type: document?.docType ?? "Regulation",
      language: document?.language ?? "en",
      source_url: document?.source_url ?? source_url ?? null,
      published_at: document?.published_at ?? null,
    } as any;

    // If source_url is provided and chunks not provided, fetch and chunk
    let finalChunks = chunks ?? [];
    if (finalChunks.length === 0 && source_url) {
      const fetched = await fetch(source_url);
      const html = await fetched.text();
      const plain = stripHtml(html);
      const pieces = chunkText(plain, 2000);
      finalChunks = pieces.map((t, i) => ({
        path_hierarchy: `Auto Section ${i + 1}`,
        number_label: String(i + 1),
        text_raw: t,
      }));
    }

    if (!finalChunks.length) {
      return new Response(JSON.stringify({ error: "No chunks to process" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert document
    const { data: docRow, error: docErr } = await supabase
      .from("reggio.regulation_documents")
      .upsert({
        regulation_id: regulationId,
        version_label: finalDoc.version_label,
        doc_type: finalDoc.doc_type,
        language: finalDoc.language,
        source_url: finalDoc.source_url,
        published_at: finalDoc.published_at,
      }, { onConflict: "regulation_id,source_url,version_label" })
      .select("id")
      .maybeSingle();

    if (docErr) throw docErr;
    const documentId = docRow?.id;

    let insertedClauses = 0;
    let insertedObligations = 0;

    for (const c of finalChunks) {
      const ai = await callGroqForChunk(c.text_raw, c.path_hierarchy);

      const { data: clauseRows, error: clauseErr } = await supabase
        .from("reggio.clauses")
        .insert({
          regulation_id: regulationId,
          document_id: documentId,
          path_hierarchy: c.path_hierarchy ?? null,
          number_label: c.number_label ?? null,
          text_raw: c.text_raw,
          summary_plain: ai.summary_plain ?? null,
          obligation_type: ai.obligation_type ?? null,
          risk_area: ai.risk_area ?? null,
          themes: ai.themes ?? null,
          industries: ai.industries ?? null,
        })
        .select("id");

      if (clauseErr) throw clauseErr;
      const clauseId = clauseRows?.[0]?.id;
      if (clauseId) insertedClauses += 1;

      if (ai.obligations && Array.isArray(ai.obligations) && clauseId) {
        const obligationsToInsert = ai.obligations
          .filter((o: any) => o && o.description)
          .map((o: any) => ({
            clause_id: clauseId,
            description: o.description,
            due_date_estimate: o.due_date_estimate ?? null,
            related_clause_path: o.related_clause_path ?? null,
          }));
        if (obligationsToInsert.length) {
          const { error: oblErr, count } = await supabase
            .from("reggio.obligations")
            .insert(obligationsToInsert, { count: "exact" });
          if (oblErr) throw oblErr;
          insertedObligations += count ?? obligationsToInsert.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        documentId,
        clauses: insertedClauses,
        obligations: insertedObligations,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("reggio-ingest error", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
