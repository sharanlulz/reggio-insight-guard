import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Regulation = {
  id: string;
  title: string;
  short_code: string;
};

type Clause = {
  id: string;
  regulation_id: string | null;
  document_id: string | null;
  path_hierarchy: string | null;
  number_label: string | null;
  text_raw: string | null;
  summary_plain: string | null;
  obligation_type: string | null;
  risk_area: string | null;
  risk_area_text?: string | null;
  themes?: string[] | null;
  industries?: string[] | null;
};

const PAGE_SIZE = 30;

const RISK_AREAS = [
  "LIQUIDITY","CAPITAL","MARKET","CREDIT","OPERATIONAL","CONDUCT",
  "AML_CFT","DATA_PRIVACY","TECH_RISK","OUTSOURCING","IRRBB","RRP","RISK_MANAGEMENT",
];

const OBLIGATION_TYPES = [
  "MANDATORY","RECOMMENDED","REPORTING","DISCLOSURE",
  "RESTRICTION","GOVERNANCE","RISK_MANAGEMENT","RECORD_KEEPING",
];

function highlight(text: string | null | undefined, term: string) {
  if (!text) return null;
  if (!term.trim()) return text;
  try {
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`(${safe})`, "ig");
    const parts = text.split(rx);
    return parts.map((p, i) =>
      rx.test(p) ? (
        <mark key={i} className="px-0.5 rounded bg-yellow-200">
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      )
    );
  } catch {
    return text;
  }
}

export default function ClausesPage() {
  // Regulations (for filter)
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [regId, setRegId] = useState<string>("");

  // Filters
  const [riskSel, setRiskSel] = useState<string[]>([]);
  const [oblSel, setOblSel] = useState<string[]>([]);
  const [q, setQ] = useState<string>("");

  // Results
  const [rows, setRows] = useState<Clause[]>([]);
  const [page, setPage] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Preload regulations
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("regulations")
        .select("id, title, short_code")
        .order("title");
      if (!error) setRegs((data || []) as Regulation[]);
    })();
  }, []);

  const orSearch = useMemo(() => {
    if (!q.trim()) return null;
    const like = `%${q.trim()}%`;
    // PostgREST OR across columns (NULL-safe: ilike handles non-null rows)
    return `summary_plain.ilike.${like},text_raw.ilike.${like}`;
  }, [q]);

  const runQuery = useCallback(
    async (pageIndex: number) => {
      setLoading(true);

      // Base query on public.clauses
      let query = supabase.from("clauses").select("*", {
        count: "exact",
      });

      // Regulation
      if (regId) query = query.eq("regulation_id", regId);

      // Risk filter (multi)
      if (riskSel.length > 0) query = query.in("risk_area", riskSel);

      // Obligation type (multi)
      if (oblSel.length > 0) query = query.in("obligation_type", oblSel);

      // Search across summary OR raw text
      if (orSearch) {
        query = query.or(orSearch);
      }

      // Order by most recently created (or path)
      query = query.order("created_at", { ascending: false });

      // Pagination
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Query error", error);
        setRows([]);
        setTotal(0);
      } else {
        setRows((data || []) as Clause[]);
        setTotal(Number(count || 0));
      }
      setLoading(false);
    },
    [regId, riskSel, oblSel, orSearch]
  );

  // Run on initial & whenever filters/page change
  useEffect(() => {
    runQuery(page);
  }, [runQuery, page]);

  // Reset to page 0 if filters/search change
  useEffect(() => {
    setPage(0);
  }, [regId, riskSel, oblSel, q]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onToggleMulti = (sel: string[], setSel: (v: string[]) => void, val: string) => {
    setSel(sel.includes(val) ? sel.filter((x) => x !== val) : [...sel, val]);
  };

  const copy = async (txt?: string | null) => {
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      alert("Copied to clipboard");
    } catch {
      alert("Could not copy");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Clauses</h1>
          <p className="text-sm text-muted-foreground">
            Search and filter AI-tagged clauses across your regulations.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            className="border rounded-md px-3 py-2 bg-background min-w-[260px]"
            placeholder="Search summary or full text…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="outline" onClick={() => setQ("")}>
            Clear
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Regulation</label>
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={regId}
              onChange={(e) => setRegId(e.target.value)}
            >
              <option value="">All</option>
              {regs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.short_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Risk area</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {RISK_AREAS.map((r) => (
                <button
                  key={r}
                  onClick={() => onToggleMulti(riskSel, setRiskSel, r)}
                  className={`text-xs px-2 py-1 rounded border ${
                    riskSel.includes(r) ? "bg-primary text-white" : "bg-background"
                  }`}
                >
                  {r}
                </button>
              ))}
              {riskSel.length > 0 && (
                <Button
                  variant="outline"
                  className="ml-2"
                  onClick={() => setRiskSel([])}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Obligation type</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {OBLIGATION_TYPES.map((o) => (
                <button
                  key={o}
                  onClick={() => onToggleMulti(oblSel, setOblSel, o)}
                  className={`text-xs px-2 py-1 rounded border ${
                    oblSel.includes(o) ? "bg-primary text-white" : "bg-background"
                  }`}
                >
                  {o}
                </button>
              ))}
              {oblSel.length > 0 && (
                <Button
                  variant="outline"
                  className="ml-2"
                  onClick={() => setOblSel([])}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${total} result${total === 1 ? "" : "s"}`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </Button>
          <span className="text-sm">
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {rows.length === 0 && !loading && (
        <p className="text-muted-foreground">No clauses match your filters.</p>
      )}

      <div className="grid gap-4">
        {rows.map((c) => (
          <Card key={c.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">
                <span className="mr-2">{c.path_hierarchy || "—"}</span>
                {c.number_label && <span>• {c.number_label}</span>}
              </div>
              <div className="text-xs flex items-center gap-2">
                {c.risk_area && (
                  <span className="px-2 py-1 rounded bg-muted">{c.risk_area}</span>
                )}
                {c.obligation_type && (
                  <span className="px-2 py-1 rounded bg-muted">{c.obligation_type}</span>
                )}
              </div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Summary</div>
              <div className="prose prose-sm max-w-none">
                {highlight(c.summary_plain || "", q)}
              </div>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Show source text
              </summary>
              <div className="mt-2 prose prose-sm max-w-none">
                {highlight(c.text_raw || "", q)}
              </div>
            </details>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => copy(c.summary_plain)}
                className="text-xs"
              >
                Copy summary
              </Button>
              {c.document_id && (
                <a
                  className="text-xs underline text-primary"
                  href={`#/documents/${c.document_id}`}
                  onClick={(e) => {
                    // if you have a Documents route, this will work; otherwise ignore.
                    e.stopPropagation();
                  }}
                >
                  Open document
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
