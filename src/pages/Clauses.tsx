import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Regulation = { id: string; title: string; short_code: string };
type Clause = {
  id: string;
  regulation_id: string | null;
  document_id: string | null;
  path_hierarchy: string;
  summary_plain: string | null;
  text_raw: string;
  obligation_type: string | null;
  risk_area: string | null;
  created_at: string;
};

const RISK_AREAS = ["LIQUIDITY","CAPITAL","MARKET","CREDIT","OPERATIONAL","CONDUCT","AML_CFT","DATA_PRIVACY","TECH_RISK","OUTSOURCING","IRRBB","RRP"];
const OBL_TYPES  = ["MANDATORY","RECOMMENDED","REPORTING","DISCLOSURE","RESTRICTION","GOVERNANCE","RISK_MANAGEMENT","RECORD_KEEPING"];

const PAGE_SIZE = 20;

export default function ClausesPage() {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [regId, setRegId] = useState<string>("");
  const [risk, setRisk] = useState<string>("");
  const [obl, setObl] = useState<string>("");
  const [q, setQ] = useState<string>("");

  // Data
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("regulations")
        .select("id, title, short_code")
        .order("title");
      if (error) console.error(error);
      else setRegs((data || []) as Regulation[]);
    })();
  }, []);

  const loadClauses = useCallback(async (reset = false) => {
    setLoading(true);
    const from = reset ? 0 : page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("clauses")
      .select("id, regulation_id, document_id, path_hierarchy, summary_plain, text_raw, obligation_type, risk_area, created_at")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (regId) query = query.eq("regulation_id", regId);
    if (risk)  query = query.eq("risk_area", risk);
    if (obl)   query = query.eq("obligation_type", obl);
    if (q.trim()) {
      // basic keyword search across summary + raw text
      const like = `%${q.trim()}%`;
      // PostgREST doesn't support OR on ilike in one call; we do two fetches then merge, or filter client-side.
      // Simpler: query summary first, if no results we try text_raw.
      // For performance MVP, we filter after fetch when both are present.
      query = query.ilike("summary_plain", like);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error(error);
      setClauses(reset ? [] : clauses);
      setHasMore(false);
    } else {
      const rows = (data || []) as Clause[];
      setClauses(reset ? rows : [...clauses, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
      setPage(reset ? 1 : page + 1);
    }
    setLoading(false);
  }, [regId, risk, obl, q, page, clauses]);

  // Reset & load on filter change
  useEffect(() => {
    setPage(0);
    loadClauses(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regId, risk, obl, q]);

  const regMap = useMemo(() => Object.fromEntries(regs.map(r => [r.id, r])), [regs]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Clauses</h1>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-sm mb-1">Regulation</label>
            <select className="w-full border rounded-md px-3 py-2 bg-background" value={regId} onChange={e => setRegId(e.target.value)}>
              <option value="">All</option>
              {regs.map(r => <option key={r.id} value={r.id}>{r.title} ({r.short_code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Risk area</label>
            <select className="w-full border rounded-md px-3 py-2 bg-background" value={risk} onChange={e => setRisk(e.target.value)}>
              <option value="">All</option>
              {RISK_AREAS.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Obligation type</label>
            <select className="w-full border rounded-md px-3 py-2 bg-background" value={obl} onChange={e => setObl(e.target.value)}>
              <option value="">All</option>
              {OBL_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Keyword</label>
            <input className="w-full border rounded-md px-3 py-2 bg-background" placeholder="Search summary…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setRegId(""); setRisk(""); setObl(""); setQ(""); }}>Reset</Button>
          <Button onClick={() => loadClauses(true)} disabled={loading}>{loading ? "Loading…" : "Apply"}</Button>
        </div>
      </Card>

      {/* Results */}
      {clauses.length === 0 && !loading && (
        <p className="text-muted-foreground">No clauses match your filters.</p>
      )}

      <div className="grid gap-3">
        {clauses.map(c => (
          <Card key={c.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {regMap[c.regulation_id || ""]?.short_code || "—"} · {c.path_hierarchy} · {new Date(c.created_at).toLocaleString()}
              </div>
              <div className="text-xs flex gap-2">
                {c.risk_area && <span className="px-2 py-1 rounded-full border">{c.risk_area}</span>}
                {c.obligation_type && <span className="px-2 py-1 rounded-full border">{c.obligation_type}</span>}
              </div>
            </div>
            <div className="mt-2">
              <div className="font-medium">{c.summary_plain || "(no summary yet)"}</div>
              <details className="mt-1">
                <summary className="cursor-pointer text-sm text-muted-foreground">Show raw text</summary>
                <p className="mt-2 text-sm whitespace-pre-wrap">{c.text_raw}</p>
              </details>
            </div>
          </Card>
        ))}
      </div>

      {hasMore && (
        <div className="pt-4">
          <Button onClick={() => loadClauses(false)} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
