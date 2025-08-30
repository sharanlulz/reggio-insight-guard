// src/pages/OperatorDashboard.tsx
// Operator Dashboard (AI Analysis–focused)

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, RefreshCw, AlertCircle, Play, Rocket } from "lucide-react";

type CoverageRow = {
  regulation_id: string;
  regulation_title: string | null;
  regulation_short_code: string | null;
  total_source_clauses: number | null;
  analyzed_clauses: number | null;
  percent_complete: number | null;
  last_analysis_at: string | null;
};

type AnalyzeResult = {
  ok: boolean;
  processed?: number;
  errors?: number;
  total_in_batch?: number;
  processing_time_seconds?: number;
  model_used?: string;
  error?: string;
};

function StatusPill({ pct }: { pct: number }) {
  let cls = "bg-blue-100 text-blue-800 border-blue-200";
  if (pct >= 100) cls = "bg-green-100 text-green-800 border-green-200";
  else if (pct === 0) cls = "bg-gray-100 text-gray-800 border-gray-200";
  return <Badge variant="outline" className={cls}>{pct}%</Badge>;
}

export default function OperatorDashboard() {
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const hasPending = useMemo(
    () => rows.some(r => (r.analyzed_clauses ?? 0) < (r.total_source_clauses ?? 0)),
    [rows]
  );

  const lastPctRef = useRef<Record<string, number>>({});

  async function load() {
    setLastError(null);
    setLoading(true);
    try {
      // Prefer the live view (analysis_coverage_v); swap to _mv if you later adopt the materialized view
      const { data, error } = await supabase
        .from("analysis_coverage_v")
        .select("*")
        .order("regulation_title", { ascending: true });

      if (error) throw error;
      setRows((data || []) as CoverageRow[]);
    } catch (e: any) {
      setLastError(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const hasActive = rows.some(r => {
      const pct = Math.round((r.percent_complete ?? 0));
      const prev = lastPctRef.current[r.regulation_id] ?? -1;
      const moving = pct !== prev;
      lastPctRef.current[r.regulation_id] = pct;
      // Consider auto-refresh useful if any is < 100 or is moving
      return pct < 100 || moving;
    });

    const intervalMs = hasActive ? 5000 : 15000;
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, rows]);

  async function analyzeOne(regulation_id: string) {
    setRunning(prev => ({ ...prev, [regulation_id]: true }));
    setLastError(null);
    try {
      const { data, error } = await supabase.functions.invoke<AnalyzeResult>("reggio-analyze", {
        body: {
          regulation_id,
          batch_size: 4, // small, safe batch for Edge time limits
        },
      });
      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || "Unknown analysis error");
      }
      // Light delay to allow DB commits to be visible, then reload
      await new Promise(res => setTimeout(res, 800));
      await load();
    } catch (e: any) {
      setLastError(e?.message || String(e));
    } finally {
      setRunning(prev => ({ ...prev, [regulation_id]: false }));
    }
  }

  async function analyzeAllPending() {
    setBulkBusy(true);
    setLastError(null);
    try {
      const pending = rows.filter(r => (r.analyzed_clauses ?? 0) < (r.total_source_clauses ?? 0));
      for (const r of pending) {
        await analyzeOne(r.regulation_id);
        // Gentle backoff between regs
        await new Promise(res => setTimeout(res, 1200));
      }
    } catch (e: any) {
      setLastError(e?.message || String(e));
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Operator Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            AI Analysis across all scraped regulations. Ingestion is handled externally by Node.js.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(v => !v)}
          >
            {autoRefresh ? "Auto-Refresh: On" : "Auto-Refresh: Off"}
          </Button>
          <Button variant="outline" onClick={load} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* CTA Card */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-purple-100 text-purple-700">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium">AI Analysis</div>
              <div className="text-sm text-muted-foreground">
                Extract obligations, thresholds, and stress parameters from source clauses.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={analyzeAllPending}
              disabled={!hasPending || bulkBusy}
            >
              <Rocket className="h-4 w-4 mr-2" />
              Analyze All Pending
            </Button>
          </div>
        </div>
      </Card>

      {lastError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{lastError}</AlertDescription>
        </Alert>
      )}

      {/* List */}
      <Card className="p-4">
        <div className="mb-3 text-lg font-semibold">Regulations</div>

        {rows.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            No regulations found. Make sure the scraper has populated <code>reggio.source_clauses</code>.
          </div>
        )}

        <div className="grid gap-3">
          {rows.map((r) => {
            const total = r.total_source_clauses ?? 0;
            const done = r.analyzed_clauses ?? 0;
            const pct = Math.min(100, Math.max(0, Math.round(r.percent_complete ?? 0)));
            const needs = done < total;

            const busy = !!running[r.regulation_id];

            return (
              <div key={r.regulation_id} className="border rounded-lg p-4">
                <div className="grid items-start gap-3 md:grid-cols-[1fr_auto]">
                  {/* Left */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">
                        {r.regulation_title || "Untitled Regulation"}
                      </div>
                      {r.regulation_short_code && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">
                          {r.regulation_short_code}
                        </Badge>
                      )}
                      <StatusPill pct={pct} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {done}/{total} clauses analyzed
                      {r.last_analysis_at && (
                        <> • last: {new Date(r.last_analysis_at).toLocaleString()}</>
                      )}
                    </div>

                    <div className="mt-2">
                      <Progress value={pct} className="h-2" />
                    </div>
                  </div>

                  {/* Right / Actions */}
                  <div className="flex items-center gap-2 md:justify-end">
                    <Button
                      variant={needs ? "default" : "outline"}
                      onClick={() => analyzeOne(r.regulation_id)}
                      disabled={busy || (!needs && pct >= 100)}
                      className={needs ? "bg-blue-600 hover:bg-blue-700" : ""}
                    >
                      {busy ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Working…
                        </>
                      ) : needs ? (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Analyze Batch
                        </>
                      ) : (
                        "Up to date"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="text-center py-8 text-muted-foreground">Loading…</div>
        )}
      </Card>

      {autoRefresh && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Auto-refreshing every 5–15 seconds while analysis is in progress…
        </div>
      )}
    </div>
  );
}
