import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { withRetry } from "@/lib/supaRetry";

type Regulation = { id: string; title: string; short_code: string };
type RegDoc = { id: string; version_label: string; created_at: string };
type Clause = {
  id: string;
  path_hierarchy: string;
  summary_plain: string | null;
  risk_area: string | null;
};
type Obligation = {
  id: string;
  clause_id: string;
  obligation_text: string | null;
  related_clause_path: string | null;
};

function formatDate(iso?: string | null) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

export default function BoardBrief() {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [regId, setRegId] = useState("");
  const [docs, setDocs] = useState<RegDoc[]>([]);
  const [docId, setDocId] = useState("");
  const [loading, setLoading] = useState(false);

  const [clauses, setClauses] = useState<Clause[]>([]);
  const [obls, setObls] = useState<Obligation[]>([]);
  const [counts, setCounts] = useState<{ docs: number; clauses: number; obls: number }>({ docs: 0, clauses: 0, obls: 0 });

  const [markdown, setMarkdown] = useState("");
  const [title, setTitle] = useState("Board Brief — Compliance Update");

  const [errRegs, setErrRegs] = useState<string | null>(null);
  const [errDocs, setErrDocs] = useState<string | null>(null);
  const [errData, setErrData] = useState<string | null>(null);

  // Load regulations & auto-select first
  useEffect(() => {
    (async () => {
      setErrRegs(null);
      const { data, error } = await withRetry(async () =>
        supabase.from("regulations").select("id, title, short_code").order("title")
      );
      if (error) {
        setErrRegs(error.message || JSON.stringify(error));
        setRegs([]);
        return;
      }
      const list = (data || []) as Regulation[];
      setRegs(list);
      if (list.length && !regId) setRegId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load versions for selected regulation & auto-select latest
  useEffect(() => {
    if (!regId) { setDocs([]); setDocId(""); return; }
    (async () => {
      setErrDocs(null);
      const { data, error } = await withRetry(async () =>
        supabase
          .from("regulation_documents")
          .select("id, version_label, created_at")
          .eq("regulation_id", regId)
          .order("created_at", { ascending: false })
      );
      if (error) {
        setErrDocs(error.message || JSON.stringify(error));
        setDocs([]);
        setDocId("");
        return;
      }
      const rows = (data || []) as RegDoc[];
      setDocs(rows);
      setCounts((c) => ({ ...c, docs: rows.length }));
      setDocId(rows[0]?.id || "");
    })();
  }, [regId]);

  const loadData = useCallback(async () => {
    if (!docId) { setClauses([]); setObls([]); setCounts((c)=>({ ...c, clauses:0, obls:0 })); return; }
    setLoading(true);
    setErrData(null);

    // CLAUSES
    const { data: cls, error: e1, count: cCount } = await withRetry(async () =>
      supabase
        .from("clauses")
        .select("id, path_hierarchy, summary_plain, risk_area", { count: "exact" })
        .eq("document_id", docId)
        .order("path_hierarchy")
    );
    if (e1) {
      setErrData(e1.message || JSON.stringify(e1));
      setClauses([]);
      setObls([]);
      setLoading(false);
      return;
    }
    const clauseRows = (cls || []) as Clause[];
    setClauses(clauseRows);
    setCounts((c) => ({ ...c, clauses: Number(cCount || clauseRows.length) }));

    // OBLIGATIONS (only for those clause IDs)
    const clauseIds = clauseRows.map((c: any) => c.id);
    if (clauseIds.length) {
      const { data: os, error: e2, count: oCount } = await withRetry(async () =>
        supabase
          .from("obligations")
          .select("id, clause_id, obligation_text, related_clause_path", { count: "exact" })
          .in("clause_id", clauseIds)
      );
      if (e2) {
        setErrData(e2.message || JSON.stringify(e2));
        setObls([]);
        setLoading(false);
        return;
      }
      const oblRows = (os || []) as Obligation[];
      setObls(oblRows);
      setCounts((c) => ({ ...c, obls: Number(oCount || oblRows.length) }));
    } else {
      setObls([]);
      setCounts((c) => ({ ...c, obls: 0 }));
    }

    setLoading(false);
  }, [docId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build markdown grouped by risk_area
  const builtMarkdown = useMemo(() => {
    if (!clauses.length) return "# Board Brief\n\n_No clauses available for this version._";

    const groups = new Map<string, Clause[]>();
    for (const c of clauses) {
      const key = c.risk_area || "UNASSIGNED";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }

    const findObls = (clauseId: string) =>
      obls.filter(o => o.clause_id === clauseId && (o.obligation_text || "").trim().length > 0);

    let md = `# ${title}\n\n`;
    const docMeta = docs.find(d => d.id === docId);
    const regMeta = regs.find(r => r.id === regId);
    md += `**Regulation:** ${regMeta?.title || "—"} (${regMeta?.short_code || "—"})\n\n`;
    md += `**Version:** ${docMeta?.version_label || "—"}  \n`;
    md += `**Generated:** ${new Date().toLocaleString()}\n\n`;

    const order = Array.from(groups.keys()).sort();
    for (const risk of order) {
      md += `\n## ${risk}\n`;
      const arr = groups.get(risk)!;
      for (const c of arr) {
        md += `\n### ${c.path_hierarchy}\n`;
        if (c.summary_plain) md += `${c.summary_plain}\n`;
        const os = findObls(c.id);
        if (os.length) {
          md += `\n**Obligations:**\n`;
          for (const o of os) {
            md += `- ${o.obligation_text}${o.related_clause_path ? ` _(ref: ${o.related_clause_path})_` : ""}\n`;
          }
        }
      }
    }
    return md.trim() + "\n";
  }, [title, clauses, obls, regId, docId, regs, docs]);

  // When data changes, populate editor with generated markdown
  useEffect(() => { setMarkdown(builtMarkdown); }, [builtMarkdown]);

  // Print to PDF
  const exportPdf = () => window.print();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Board Brief</h1>

      {(errRegs || errDocs || errData) && (
        <Card className="p-3 text-sm bg-red-50 text-red-700">
          <div><b>Data error</b></div>
          {errRegs && <div>Regulations: {errRegs}</div>}
          {errDocs && <div>Documents: {errDocs}</div>}
          {errData && <div>Data: {errData}</div>}
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium">Regulation</label>
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={regId}
              onChange={(e) => setRegId(e.target.value)}
            >
              <option value="">-- Choose --</option>
              {regs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.short_code})
                </option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground mt-1">
              Regulations: {regs.length}
            </div>
          </div>

        <div>
            <label className="block text-sm font-medium">Version</label>
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              disabled={!docs.length}
            >
              {!docs.length && <option>—</option>}
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.version_label} — {formatDate(d.created_at)}
                </option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground mt-1">
              Versions: {docs.length}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Brief Title</label>
            <input
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setMarkdown(builtMarkdown)} disabled={loading}>
            Regenerate from data
          </Button>
          <Button onClick={exportPdf} disabled={loading || !clauses.length}>
            Export to PDF
          </Button>
          <div className="text-xs text-muted-foreground ml-auto">
            Stats — Docs: {counts.docs} · Clauses: {counts.clauses} · Obligations: {counts.obls}
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <style>
          {`@media print {
            nav, .no-print, .btn, .button, .shadcn-hide { display: none !important; }
            body { background: white; }
            textarea { border: none !important; }
          }`}
        </style>
        <div className="p-3 border-b text-sm text-muted-foreground">
          Markdown (editable)
        </div>
        <textarea
          className="w-full min-h-[60vh] p-4 bg-background outline-none"
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder={loading ? "Loading…" : "No content yet — select a regulation/version above."}
        />
      </Card>
    </div>
  );
}
