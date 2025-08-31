// src/pages/OperatorDashboard.tsx
// Operator Dashboard — AI Analysis–focused
// - Lists regs that have source_clauses (from analysis_jobs_v if available, else fallback)
// - Shows analysis progress
// - Analyze and Re-analyze (clears markers via RPC then runs edge function)
// - Auto-refresh while jobs pending/running

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Brain, RefreshCw, RotateCw, Play } from "lucide-react";

type AnalysisStatus = "pending" | "running" | "completed" | "failed";

type JobRow = {
  id: string;                     // synthetic "analysis-<reg_id>"
  regulation_id: string;
  regulation_title: string;
  regulation_short_code: string | null;
  status: AnalysisStatus;
  total_clauses: number;          // total source clauses
  processed_clauses: number;      // analyzed so far (count in reggio.clauses or metadata analyzed_at)
  error_message: string | null;   // reserved for future
  started_at: string | null;      // last analyzed timestamp (if any)
  updated_at: string | null;
  finished_at: string | null;     // set when completed
};

function StatusChip({ status }: { status: AnalysisStatus }) {
  const tone =
    status === "failed"
      ? "bg-red-100 text-red-800 border-red-200"
      : status === "completed"
      ? "bg-green-100 text-green-800 border-green-200"
      : status === "pending"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : "bg-blue-100 text-blue-800 border-blue-200";
  return (
    <Badge variant="outline" className={tone}>
      {status}
    </Badge>
  );
}

export default function OperatorDashboard() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const lastProgress = useRef<Record<string, number>>({});

  // -------- Data loading --------

  // Try the view first; if missing, fallback to manual aggregation
  async function loadAnalysisJobs() {
    setLastError(null);

    // 1) Attempt to read from public.analysis_jobs_v (preferred)
    const tryView = await supabase
      .from("analysis_jobs_v")
      .select(
        "regulation_id, regulation_title, regulation_short_code, total_source_clauses, analyzed_clauses, last_analyzed_at"
      )
      .order("regulation_title", { ascending: true });

    if (!tryView.error && tryView.data) {
      const rows: JobRow[] = (tryView.data as any[]).map((r) => {
        const total = Number(r.total_source_clauses || 0);
        const analyzed = Number(r.analyzed_clauses || 0);
        const needs = analyzed < total;
        const status: AnalysisStatus =
          total === 0 ? "pending" : needs ? "running" : "completed";

        return {
          id: `analysis-${r.regulation_id}`,
          regulation_id: r.regulation_id,
          regulation_title: r.regulation_title || "Unknown Regulation",
          regulation_short_code: r.regulation_short_code ?? null,
          status,
          total_clauses: total,
          processed_clauses: analyzed,
          error_message: null,
          started_at: r.last_analyzed_at ?? null,
          updated_at: r.last_analyzed_at ?? null,
          finished_at: !needs ? r.last_analyzed_at ?? null : null,
        };
      });

      setJobs(rows);
      return;
    }

    // 2) Fallback: derive from reggio.source_clauses + regulations
    // Get regs that have ANY source_clauses
    const regsQ = await supabase
      .schema("reggio")
      .from("source_clauses")
      .select("regulation_id, regulations!inner(id, title, short_code)");

    if (regsQ.error) {
      setJobs([]);
      setLastError(`Failed to load analysis jobs: ${regsQ.error.message}`);
      return;
    }

    const regMap = new Map<
      string,
      { title: string; short_code: string | null }
    >();

    (regsQ.data || []).forEach((row: any) => {
      const id = row.regulation_id as string;
      if (id && !regMap.has(id)) {
        regMap.set(id, {
          title: row.regulations?.title ?? "Unknown Regulation",
          short_code: row.regulations?.short_code ?? null,
        });
      }
    });

    const resultRows: JobRow[] = [];

    for (const [regId, meta] of regMap) {
      // total source
      const totalQ = await supabase
        .schema("reggio")
        .from("source_clauses")
        .select("id", { count: "exact", head: true })
        .eq("regulation_id", regId);

      // analyzed: use metadata->>analyzed_at not null (your analyze function writes this)
      const analyzedQ = await supabase
        .schema("reggio")
        .from("source_clauses")
        .select("id", { count: "exact", head: true })
        .eq("regulation_id", regId)
        .not("metadata->>analyzed_at", "is", null);

      const total = Number(totalQ.count || 0);
      const analyzed = Number(analyzedQ.count || 0);
      const needs = analyzed < total;
      const status: AnalysisStatus =
        total === 0 ? "pending" : needs ? "running" : "completed";

      resultRows.push({
        id: `analysis-${regId}`,
        regulation_id: regId,
        regulation_title: meta.title,
        regulation_short_code: meta.short_code,
        status,
        total_clauses: total,
        processed_clauses: analyzed,
        error_message: null,
        started_at: null,
        updated_at: null,
        finished_at: !needs ? new Date().toISOString() : null,
      });
    }

    resultRows.sort((a, b) =>
      a.regulation_title.localeCompare(b.regulation_title)
    );

    setJobs(resultRows);
  }

  async function loadAll() {
    setLoading(true);
    try {
      await loadAnalysisJobs();
    } catch (e: any) {
      setLastError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // -------- Actions --------

  async function startAnalysis(regulationId: string) {
    setLastError(null);
    try {
      const { data, error } = await supabase.functions.invoke("reggio-analyze", {
        body: { regulation_id: regulationId, batch_size: 4 },
      });
      if (error) throw error;
      // Refresh immediately to reflect progress
      await loadAnalysisJobs();
    } catch (e: any) {
      setLastError(`Analyze error: ${e.message || String(e)}`);
    }
  }

  async function reanalyze(regulationId: string) {
    setLastError(null);
    try {
      // Clear markers & generated clauses via the RPC you installed
      const { error: rpcErr } = await supabase.rpc("reset_clause_analysis", {
        reg_id: regulationId,
        doc_id: null,
        p_clear_generated: true,
      });
      if (rpcErr) throw rpcErr;

      // Start a fresh batch
      await startAnalysis(regulationId);
    } catch (e: any) {
      setLastError(`Re-analyze error: ${e.message || String(e)}`);
    }
  }

  // -------- Effects --------

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const hasRunning = jobs.some(
      (j) => j.status === "pending" || j.status === "running"
    );
    const interval = hasRunning ? 3000 : 15000;
    const id = setInterval(loadAll, interval);
    return () => clearInterval(id);
  }, [autoRefresh, jobs]);

  // -------- Derived --------

  const pendingCount = useMemo(
    () => jobs.filter((j) => j.status === "pending" || j.status === "running").length,
    [jobs]
  );

  // -------- Render --------

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Operator Dashboard</h1>
        <div className="flex gap-2">
          {/* Keep ingestion tucked away */}
          <Link to="/operator-ingestions">
            <Button variant="outline">Ingestion Logs</Button>
          </Link>
          <Link to="/operator-versions">
            <Button variant="outline">Manage Versions</Button>
          </Link>
        </div>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium">AI Analysis</div>
            <div className="text-sm text-muted-foreground">
              Analyze scraped source clauses; re-run safely without touching raw data.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh((v) => !v)}
            >
              {autoRefresh ? "Auto-Refresh: On" : "Auto-Refresh: Off"}
            </Button>
            <Button
              variant="outline"
              onClick={loadAll}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Errors */}
      {lastError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{lastError}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Jobs */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">AI Analysis Jobs</div>
          <Button
            onClick={async () => {
              for (const j of jobs) {
                if (j.status === "pending" || j.status === "running") {
                  await startAnalysis(j.regulation_id);
                  // small spacing to avoid burst
                  // eslint-disable-next-line no-await-in-loop
                  await new Promise((r) => setTimeout(r, 1200));
                }
              }
            }}
            disabled={loading || pendingCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            Analyze All Pending ({pendingCount})
          </Button>
        </div>

        <div className="grid gap-3">
          {jobs.map((job) => {
            const pct =
              job.total_clauses > 0
                ? Math.round((job.processed_clauses / job.total_clauses) * 100)
                : 0;

            // Stall hint
            const prev = lastProgress.current[job.id] ?? -1;
            const stalled =
              (job.status === "running" || job.status === "pending") &&
              prev === job.processed_clauses &&
              job.processed_clauses > 0;
            lastProgress.current[job.id] = job.processed_clauses;

            return (
              <div key={job.id} className="border rounded-lg p-4">
                <div className="grid items-start gap-3 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <div className="font-medium">
                      {job.regulation_title}{" "}
                      {job.regulation_short_code ? (
                        <span className="text-muted-foreground">
                          ({job.regulation_short_code})
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.total_clauses} clauses
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2">
                    <StatusChip status={job.status} />
                    {stalled && (
                      <span className="text-xs text-muted-foreground">
                        stalled
                      </span>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <Progress value={pct} className="h-2 mb-1" />
                    <div className="text-xs text-muted-foreground">
                      {job.processed_clauses}/{job.total_clauses}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startAnalysis(job.regulation_id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Analyze
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reanalyze(job.regulation_id)}
                      title="Clear analysis markers and re-run"
                    >
                      <RotateCw className="h-4 w-4 mr-1" />
                      Re-analyze
                    </Button>
                  </div>
                </div>

                {job.error_message && (
                  <div className="mt-2 text-xs text-red-600">
                    {job.error_message}
                  </div>
                )}
              </div>
            );
          })}

          {jobs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No analysis jobs yet. Ingest a regulation (Node scraper) and refresh.
            </div>
          )}
        </div>

        {autoRefresh && (pendingCount > 0) && (
          <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Auto-refreshing every 3–15 seconds…
          </div>
        )}
      </Card>
    </div>
  );
}
