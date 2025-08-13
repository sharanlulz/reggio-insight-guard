import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { withRetry } from "@/lib/supaRetry";

type Regulation = { id: string; title: string; short_code: string };
type Clause = {
  id: string;
  regulation_id: string | null;
  document_id: string | null;
  path_hierarchy: string;
  number_label: string | null;
  text_raw: string;
  summary_plain: string | null;
  obligation_type: string | null;
  risk_area: string | null;
  themes: string[] | null;
  industries: string[] | null;
  created_at: string;
  regulation_title: string | null;
  regulation_short_code: string | null;
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
const OBLIGATION_TYPES = [
  "MANDATORY",
  "RECOMMENDED",
  "REPORTING",
  "DISCLOSURE",
  "RESTRICTION",
  "GOVERNANCE",
  "RISK_MANAGEMENT",
  "RECORD_KEEPING",
];
const RISK_AREAS = [
  "LIQUIDITY",
  "CAPITAL",
  "MARKET",
  "CREDIT",
  "OPERATIONAL",
  "CONDUCT",
  "AML_CFT",
  "DATA_PRIVACY",
  "TECH_RISK",
  "OUTSOURCING",
  "IRRBB",
  "RRP",
  "RISK_MANAGEMENT",
];

function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function highlightText(text: string, q: string) {
  if (!q) return text;
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${esc})`, "ig");
  return text.split(re).map((p, i) =>
    re.test(p) ? (
      <mark key={i} className="bg-yellow-200 px-0.5 rounded">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function ClausesPage() {
  // Filters
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [regId, setRegId] = useState("");
  const [risk, setRisk] = useState("");
  const [obType, setObType] = useState("");
  const [search, setSearch] = useState("");
  const [searchIn, setSearchIn] = useState<"both" | "summary" | "text">("both");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [total, setTotal] = useState(0);

  // Data
  const [rows, setRows] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQ = useDebounced(search, 350);

  // Load regulations (for the dropdown)
  useEffect(() => {
    (async () => {
      const { data, error } = await withRetry(() =>
        supabase.from("regulations").select("id, title, short_code").order("title")
      );
      if (!error && data) setRegs(data as Regulation[]);
    })();
  }, []);

  // COUNT + PAGE fetch via public.clauses_v
  const fetchData = useCallback(async () => {
    setLoading(true);

    // ----- COUNT (headers only) -----
    let countQ = supabase.from("clauses_v").select("*", { count: "exact", head: true });
    if (regId) countQ = countQ.eq("regulation_id", regId);
    if (risk) countQ = countQ.eq("risk_area", risk);
    if (obType) countQ = countQ.eq("obligation_type", obType);
    if (debouncedQ) {
      const like = `%${debouncedQ}%`;
      if (searchIn === "both") {
        // Search across summary, raw text, AND regulation title for convenience
        countQ = countQ.or(
          `summary_plain.ilike.${like},text_raw.ilike.${like},regulation_title.ilike.${like}`
        );
      } else if (searchIn === "summary") {
        countQ = countQ.ilike("summary_plain", like);
      } else {
        countQ = countQ.ilike("text_raw", like);
      }
    }
    const { count } = await withRetry(() => countQ);
    setTotal(Number(count || 0));

    // ----- DATA -----
    let q = supabase
      .from("clauses_v")
      .select(
        "id, regulation_id, document_id, path_hierarchy, number_label, text_raw, summary_plain, obligation_type, risk_area, themes, industries, created_at, regulation_title, regulation_short_code"
      )
      .order("created_at", { ascending: false });

    if (regId) q = q.eq("regulation_id", regId);
    if (risk) q = q.eq("risk_area", risk);
    if (obType) q = q.eq("obligation_type", obType);
    if (debouncedQ) {
      const like = `%${debouncedQ}%`;
      if (searchIn === "both") {
        q = q.or(
          `summary_plain.ilike.${like},text_raw.ilike.${like},regulation_title.ilike.${like}`
        );
      } else if (searchIn === "summary") {
        q = q.ilike("summary_plain", like);
      } else {
        q = q.ilike("text_raw", like);
      }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    q = q.range(from, to);

    const { data, error } = await withRetry(() => q);
    setRows(!error && data ? (data as Clause[]) : []);
    setLoading(false);
  }, [regId, risk, obType, debouncedQ, searchIn, page, pageSize]);

  useEffect(() => setPage(1), [regId, risk, obType, debouncedQ, searchIn]);
  useEffect(() => { fetchData(); }, [fetchData, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Clauses</h1>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          {/* Regulation */}
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

          {/* Risk Area */}
          <div>
            <label className="block text-sm font-medium">Risk Area</label>
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
            >
              <option value="">All</option>
              {RISK_AREAS.map((ra) => (
                <option key={ra} value={ra}>
                  {ra}
                </option>
              ))}
            </select>
          </div>

          {/* Obligation Type */}
          <div>
            <label className="block text-sm font-medium">Obligation Type</label>
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={obType}
              onChange={(e) => setObType(e.target.value)}
            >
              <option value="">All</option>
              {OBLIGATION_TYPES.map((ob) => (
                <option key={ob} value={ob}>
                  {ob}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium">Search</label>
            <input
              className="w-full border rounded-md px-3 py-2 bg-background"
              placeholder="Search summary/text/regulation title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="mt-2 text-xs flex gap-3 items-center">
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
                summary only
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="searchIn"
                  value="text"
                  checked={searchIn === "text"}
                  onChange={() => setSearchIn("text")}
                />
                text only
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${total} result${total === 1 ? "" : "s"}`}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Page size</label>
            <select
              className="border rounded-md px-2 py-1 bg-background"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        {rows.map((cl) => {
          const showText = searchIn !== "summary";
          const showSummary = searchIn !== "text";
          return (
            <Card key={cl.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                {/* NEW: regulation tag */}
                {cl.regulation_title && (
                  <span className="px-2 py-1 rounded bg-muted">
                    {cl.regulation_short_code || ""} {cl.regulation_short_code ? "·" : ""}
                    {cl.regulation_title}
                  </span>
                )}
                <span className="px-2 py-1 rounded bg-muted">{cl.path_hierarchy}</span>
                {cl.risk_area && <span className="px-2 py-1 rounded bg-muted">{cl.risk_area}</span>}
                {cl.obligation_type && <span className="px-2 py-1 rounded bg-muted">{cl.obligation_type}</span>}
                {cl.themes?.slice(0, 3).map((t) => (
                  <span key={t} className="px-2 py-1 rounded bg-muted">#{t}</span>
                ))}
                <span className="ml-auto">{new Date(cl.created_at).toLocaleString()}</span>
              </div>

              {showSummary && cl.summary_plain && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Summary</div>
                  <div className="leading-relaxed">{highlightText(cl.summary_plain, debouncedQ)}</div>
                </div>
              )}

              {showText && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Clause text</div>
                  <div className="leading-relaxed line-clamp-6">{highlightText(cl.text_raw, debouncedQ)}</div>
                </div>
              )}
            </Card>
          );
        })}

        {!loading && rows.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground">
            No results. Try widening filters or search terms.
          </Card>
        )}
      </div>

      {/* Pager */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-muted-foreground">Page {page} / {totalPages}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPage(1)} disabled={page <= 1}>« First</Button>
          <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>‹ Prev</Button>
          <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next ›</Button>
          <Button variant="outline" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last »</Button>
        </div>
      </div>
    </div>
  );
}
