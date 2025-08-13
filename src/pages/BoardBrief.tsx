import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { withRetry } from "@/lib/supaRetry";

type Regulation = { id: string; title: string; short_code: string };
type RegDoc = { id: string; version_label: string; created_at: string };
type ClauseRow = {
  id: string;
  document_id: string | null;
  path_hierarchy: string;
  summary_plain: string | null;
  risk_area: string | null;
  regulation_title: string | null;
  regulation_short_code: string | null;
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

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function matchClause(c: ClauseRow, q: string, mode: "both" | "summary" | "text") {
  if (!q) return true;
  const haySummary = (c.summary_plain || "").toLowerCase();
  const hayText = `${c.path_hierarchy}`.toLowerCase(); // we don't carry full text here on purpose
  const ql = q.toLowerCase();

  if (mode === "summary") return haySummary.includes(ql);
  if (mode === "text") return hayText.includes(ql);
  return haySummary.includes(ql) || hayText.includes(ql);
}

export default function BoardBrief() {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [regId, setRegId] = useState("");
  const [docs, setDocs] = useState<RegDoc[]>([]);
  const [docId, setDocId] = useState("");
  const [loading, setLoading] = useState(false);

  const [clauses, setClauses] = useState<ClauseRow[]>([]);
  const [obls, setObls] = useState<Obligation[]>([]);
  const [counts, setCounts] = useState<{ docs: number; clauses: number; obls: number }>({
    docs: 0,
    clauses: 0,
    obls: 0,
  });

  const [title, setTitle] = useState("Board Brief — Compliance Update");

  // NEW: local search on the brief view
  const [search, setSearch] = useState("");
  const [searchIn, setSearchIn] = useState<"both" | "summary" | "text">("both");
  const q = useDebounced(search, 250);

  const [errRegs, setErrRegs] = useState<string | null>(null);
  const [errDocs, setErrDocs] = useState<string | null>(null);
  const [errData, setErrData] = useState<string | null>(null);

  // Load regulations & auto-select first
  useEffect(() => {
    (async () => {
      setErrRegs(null);
      const { data, error } = await withRetry(() =>
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
    if (!regId) {
      setDocs([]);
      setDocId("");
      return;
    }
    (async () => {
      setErrDocs(null);
      const { data, error } = await withRetry(() =>
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

  // Load data for selected document (clauses via clauses_v + obligations)
  const loadData = useCallback(async () => {
    if (!docId) {
      setClauses([]);
      setObls([]);
      setCounts((c) => ({ ...c, clauses: 0, obls: 0 }));
      return;
    }
    setLoading(true);
    setErrData(null);

    // CLAUSES (from public.clauses_v so we also have regulation name)
    const { data: cls, error: e1, count: cCount } = await withRetry(() =>
      supabase
        .from("clauses_v")
        .select(
          "id, document_id, path_hierarchy, summary_plain, risk_area, regulation_title, regulation_short_code",
          { count: "exact" }
        )
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
    const clauseRows = (cls || []) as ClauseRow[];
    setClauses(clauseRows);
    setCounts((c) => ({ ...c, clauses: Number(cCount || clauseRows.length) }));

    // OBLIGATIONS (for those clauses)
    const clauseIds = clauseRows.map((c) => c.id);
    if (clauseIds.length) {
      const { data: os, error: e2, count: oCount } = await withRetry(() =>
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered clauses for display based on local search
  const filteredClauses = useMemo(() => {
    if (!q) return clauses;
    return clauses.filter((c) => matchClause(c, q, searchIn));
  }, [clauses, q, searchIn]);

  // Build markdown (still available for Export → Print)
  const markdown = useMemo(() => {
    if (!filteredClauses.length)
      return "# Board Brief\n\n_No clauses available (try changing search or version)._";

    const groups = new Map<string, ClauseRow[]>();
    for (const c of filteredClauses) {
      const key = c.risk_area || "UNASSIGNED";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }

    const docMeta = docs.find((d) => d.id === docId);
    const regMeta = regs.find((r) => r.id === regId);

    let md = `# ${title}\n\n`;
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
        const os = obls.filter(
          (o) => o.clause_id === c.id && (o.obligation_text || "").trim().length > 0
        );
        if (os.length) {
          md += `\n**Obligations:**\n`;
          for (const o of os) {
            md += `- ${o.obligation_text}${
              o.related_clause_path ? ` _(ref: ${o.related_clause_path})_` : ""
            }\n`;
          }
        }
      }
    }
    return md.trim() + "\n";
  }, [title, filteredClauses, obls, regId, docId, regs, docs]);

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
            <div className="text-xs text-muted-foreground mt-1">Regulations: {regs.length}</div>
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
            <div className="text-xs text-muted-foreground mt-1">Versions: {docs.length}</div>
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

        {/* NEW: brief search */}
        <div className="grid gap-3 md:grid-cols-3 pt-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Search within this brief</label>
            <input
              className="w-full border rounded-md px-3 py-2 bg-background"
              placeholder="Search summary and/or headings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Search in</label>
            <div className="flex gap-3 items-center text-sm mt-2">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="searchIn"
                  value="both"
                  checked={searchIn === "both"}
                  onChange={() => setSearchIn("both")}
                />
                both
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="searchIn"
                  value="summary"
                  checked={searchIn === "summary"}
                  onChange={() => setSearchIn("summary")}
                />
                summary
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="searchIn"
                  value="text"
                  checked={searchIn === "text"}
                  onChange={() => setSearchIn("text")}
                />
                headings only
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={exportPdf} disabled={loading || !clauses.length}>Export to PDF</Button>
          <div className="text-xs text-muted-foreground ml-auto">
            Stats — Docs: {counts.docs} · Clauses: {counts.clauses} · Obligations: {counts.obls}
          </div>
        </div>
      </Card>

      {/* Preview cards (regulation tag per clause) */}
      <div className="space-y-3">
        {filteredClauses.map((c) => {
          const os = obls.filter(
            (o) => o.clause_id === c.id && (o.obligation_text || "").trim().length > 0
          );
          return (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                {/* Regulation tag */}
                {c.regulation_title && (
                  <span className="px-2 py-1 rounded bg-muted">
                    {c.regulation_short_code || ""} {c.regulation_short_code ? "·" : ""}
                    {c.regulation_title}
                  </span>
                )}
                <span className="px-2 py-1 rounded bg-muted">{c.path_hierarchy}</span>
                {c.risk_area && <span className="px-2 py-1 rounded bg-muted">{c.risk_area}</span>}
              </div>

              {c.summary_plain && (
                <div className="mb-2 leading-relaxed">{c.summary_plain}</div>
              )}

              {os.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Obligations</div>
                  <ul className="list-disc ml-5 space-y-1">
                    {os.map((o) => (
                      <li key={o.id}>
                        {o.obligation_text}
                        {o.related_clause_path ? (
                          <span className="text-xs text-muted-foreground"> — ref: {o.related_clause_path}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}

        {!loading && filteredClauses.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground">
            No results. Try changing your search or version.
          </Card>
        )}
      </div>

      {/* Print stylesheet */}
      <style>
        {`@media print {
          nav, .no-print, .shadcn-hide { display: none !important; }
          body { background: white; }
        }`}
      </style>
    </div>
  );
}
