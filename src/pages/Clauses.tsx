// src/pages/Clauses.tsx
// Hybrid-friendly Clauses page with per-card Summary/Text toggle

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Regulation = { id: string; title: string; short_code: string };

type ClauseRow = {
  id: string;
  regulation_id: string | null;
  document_id: string | null;
  path_hierarchy: string | null;   // from view
  number_label: string | null;     // from view
  text_raw: string;                // always present
  summary_plain: string | null;    // present after AI analysis
  obligation_type: string | null;
  risk_area: string | null;
  themes: string[] | null;
  industries: string[] | null;
  created_at: string;
  regulation_title: string | null;
  regulation_short_code: string | null;
};

// -------- UI helpers --------
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

// Small helper to clamp length and highlight
function makePreview(text: string, q: string, max = 600) {
  const trimmed = text.length > max ? text.slice(0, max) + "…" : text;
  return highlightText(trimmed, q);
}

// ---- Per-card preview component with toggle ----
type ViewMode = "auto" | "summary" | "text";

function ClausePreview({
  cl,
  query,
  initialMode,
}: {
  cl: ClauseRow;
  query: string;
  initialMode: ViewMode;
}) {
  const [mode, setMode] = useState<ViewMode>(initialMode);

  // If there's no summary, force to text
  const hasSummary = !!(cl.summary_plain && cl.summary_plain.trim().length > 0);

  useEffect(() => {
    if (!hasSummary && mode !== "text") setMode("text");
  }, [hasSummary, mode]);

  // Compute chosen text
  const chosen =
    mode === "summary"
      ? (cl.summary_plain || "").trim()
      : mode === "text"
      ? cl.text_raw.trim()
      : // auto
        (cl.summary_plain && cl.summary_plain.trim().length > 0
          ? cl.summary_plain.trim()
          : cl.text_raw.trim());

  return (
    <div>
      {/* Toggle (show only if summary exists) */}
      {hasSummary && (
        <div className="mb-2 inline-flex rounded-md border overflow-hidden">
          <Button
            type="button"
            variant={mode === "summary" ? "default" : "outline"}
            onClick={() => setMode("summary")}
            className="rounded-none"
            size="sm"
          >
            Summary
          </Button>
          <Button
            type="button"
            variant={mode === "text" ? "default" : "outline"}
            onClick={() => setMode("text")}
            className="rounded-none border-l-0"
            size="sm"
          >
            Text
          </Button>
          <Button
            type="button"
            variant={mode === "auto" ? "default" : "outline"}
            onClick={() => setMode("auto")}
            className="rounded-none border-l-0"
            size="sm"
            title="Show summary when available; otherwise raw text"
          >
            Auto
          </Button>
        </div>
      )}

      {/* Label chip for clarity */}
      <div className="text-xs font-medium text-muted-foreground mb-1">
        {mode === "summary"
          ? "AI Summary"
          : mode === "text"
          ? "Clause text"
          : hasSummary
          ? "Auto (summary preferred)"
          : "Clause text"}
      </div>

      <div className="leading-relaxed">
        {makePreview(chosen, query)}
      </div>
    </div>
  );
}

// -------- Page --------
export default function Clauses() {
  // filters
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [regId, setRegId] = useState("");
  const [risk, setRisk] = useState("");
  const [obType, setObType] = useState("");
  const [search, setSearch] = useState("");
  const [searchIn, setSearchIn] = useState<"both" | "summary" | "text">("both");

  // paging
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [total, setTotal] = useState(0);

  // data
  const [rows, setRows] = useState<ClauseRow[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQ = useDebounced(search, 350);

  // Load regulation drop-down
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("regulations")
        .select("id, title, short_code")
        .order("title");
      if (!error && data) setRegs(data as Regulation[]);
    })();
  }, []);

  // Reset to first page on filter/search changes
  useEffect(() => setPage(1), [regId, risk, obType, debouncedQ, searchIn]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  // Build base filter for both count & data queries
  const applyFilters = useCallback(
    (q: any) => {
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
      return q;
    },
    [regId, risk, obType, debouncedQ, searchIn]
  );

  // Load (count + page)
  const fetchData = useCallback(async () => {
    setLoading(true);

    // Count
    let countQ = supabase.from("clauses_v").select("*", { count: "exact", head: true });
    countQ = applyFilters(countQ);
    const countRes = await countQ;
    setTotal(Number(countRes.count || 0));

    // Page
    let dataQ = supabase
      .from("clauses_v")
      .select(
        "id, regulation_id, document_id, path_hierarchy, number_label, text_raw, summary_plain, obligation_type, risk_area, themes, industries, created_at, regulation_title, regulation_short_code"
      )
      .order("created_at", { ascending: false });

    dataQ = applyFilters(dataQ);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    dataQ = dataQ.range(from, to);

    const dataRes = await dataQ;
    setRows(!dataRes.error && dataRes.data ? (dataRes.data as ClauseRow[]) : []);
    setLoading(false);
  }, [applyFilters, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set the default per-card mode from the search toggle:
  // - "summary" -> start in summary
  // - "text"    -> start in text
  // - "both"    -> auto (summary preferred)
  const defaultMode: ViewMode =
    searchIn === "summary" ? "summary" : searchIn === "text" ? "text" : "auto";

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border p-4">
        <h1 className="text-2xl font-bold text-card-foreground mb-2">Clauses</h1>
        <p className="text-sm text-muted-foreground">
          Showing scraped clauses (hybrid ingest). Toggle between <em>AI summary</em> and
          <em> raw clause text</em> on each card. “Auto” prefers summary when available.
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3 border bg-card">
        <div className="grid gap-3 md:grid-cols-4">
          {/* Regulation */}
          <div>
            <label className="block text-sm font-medium text-card-foreground">Regulation</label>
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={regId}
              onChange={(e) => setRegId(e.target.value)}
            >
              <option value="">All</option>
              {regs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} {r.short_code ? `(${r.short_code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Area */}
          <div>
            <label className="block text-sm font-medium text-card-foreground">Risk Area</label>
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
            <label className="block text-sm font-medium text-card-foreground">Obligation Type</label>
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
            <label className="block text-sm font-medium text-card-foreground">Search</label>
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
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        {rows.map((cl) => {
          return (
            <Card key={cl.id} className="p-4 border bg-card hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                {/* regulation pill */}
                {cl.regulation_title && (
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                    {cl.regulation_short_code || ""} {cl.regulation_short_code ? "·" : ""}
                    {cl.regulation_title}
                  </span>
                )}
                {/* path/number */}
                {cl.path_hierarchy && (
                  <span className="px-2 py-1 rounded bg-muted text-muted-foreground border">
                    {cl.path_hierarchy}
                  </span>
                )}
                {/* risk + obligation */}
                {cl.risk_area && (
                  <span className="px-2 py-1 rounded bg-secondary/10 text-secondary-foreground border border-secondary/20">
                    {cl.risk_area}
                  </span>
                )}
                {cl.obligation_type && (
                  <span className="px-2 py-1 rounded bg-accent/10 text-accent-foreground border border-accent/20">
                    {cl.obligation_type}
                  </span>
                )}
                {/* created */}
                <span className="ml-auto">{new Date(cl.created_at).toLocaleString()}</span>
              </div>

              {/* Preview with per-card toggle */}
              <ClausePreview cl={cl} query={debouncedQ} initialMode={defaultMode} />
            </Card>
          );
        })}

        {!loading && rows.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground border bg-card/50">
            No results. Try widening filters or search terms.
          </Card>
        )}
      </div>

      {/* Pager */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-muted-foreground">
          Page {page} / {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPage(1)} disabled={page <= 1}>
            « First
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ‹ Prev
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next ›
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
          >
            Last »
          </Button>
        </div>
      </div>
    </div>
  );
}
