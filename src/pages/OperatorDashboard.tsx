// src/pages/OperatorDashboard.tsx
// Operator Dashboard focused on AI Analysis with status aliasing
// UX statuses: ready → running → completed → failed (+ stalled overlay)

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Brain, RefreshCw, RotateCw, Play } from "lucide-react";

// --- Types from public.analysis_jobs_v (kept broad) ---
type RawJobRow = {
  regulation_id: string;
  regulation_title: string;
  regulation_short_code?: string | null;
  total_source_clauses?: number | null;
  analyzed_clauses?: number | null;
  last_analyzed_at?: string | null;
  status?: string | null; // optional legacy/backend status (ignored for UI map)
};

type UiStatus = "ready" | "running" | "completed" | "failed";

type AnalysisJob = {
  id: string;
  regulation_id: string;
  regulation_title: string;
  regulation_short_code: string | null;
  status: UiStatus;
  stalled: boolean;
  total_clauses: number;
  processed_clauses: number;
  last_analyzed_at: string | null;
};

// --- Status chip ---
function StatusChip({ status, stalled }: { status: UiStatus; stalled?: boolean }) {
  const tone =
    status === "failed"
      ? "bg-red-100 text-red-800 border-red-200"
      : status === "completed"
      ? "bg-green-100 text-green-800 border-green-200"
      : status === "ready"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : "bg-blue-100 text-blue-800 border-blue-200"; // running

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={tone}>
        {status}
      </Badge>
      {stalled && status === "running" && (
        <span className="text-xs text-muted-foreground">stalled</span>
      )}
    </div>
  );
}

// --- Map raw counts to UI status (non-breaking) ---
function normalizeStatus(raw: RawJobRow): UiStatus {
  const total = Number(raw.total_source_clauses ?? 0);
  const analyzed = Number(raw.analyzed_clauses ?? 0);
  const backend = (raw.status || "").toLowerCase();

  if (total > 0 && analyzed >= total) return "completed";
  if (total > 0 && analyzed === 0) return "ready";
  if (total > 0 && analyzed > 0 && analyzed < total) return "running";
  if (backend === "failed") return "failed";
  return "ready";
}

export default function OperatorDashboard() {
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  // remember last processed count to detect "stalled"
  const lastProgress = useRef<Record<string, number>>({});

  // --- Load from public view (hybrid-friendly; analyzed regs keep showing) ---
  async function loadAnalysisJobs() {
    setLastError(null);

    const { data, error } = await supabase
      .from("analysis_jobs_v")
      .select("*")
      .order("regulation_title", { ascending: true });

    if (error) {
      setJobs([]);
      setLastError(error.message || String(error));
      return;
    }

    const rows = (data || []) as RawJobRow[];

    const mapped: AnalysisJob[] = rows.map((r) => {
      const total = Number(r.total_source_clauses ?? 0);
      const processed = Number(r.analyzed_clauses ?? 0);
      const status = normalizeStatus(r);

      const id = `analysis-${r.regulation_id}`;
      const prev = lastProgress.current[id] ?? -1;
      const stalled = status === "running" && prev === processed && processed > 0;
      lastProgress.current[id] = processed;

      return {
        id,
        regulation_id: r.regulation_id,
        regulation_title: r.regulation_title || "Unknown Regulation",
        regulation_short_code: r.regulation_short_code || null,
        total_clauses: total,
        processed_clauses: processed,
        status,
        stalled,
        last_analyzed_at: r.last_analyzed_at || null,
      };
    });

    setJobs(mapped);
  }

  // --- Actions ---
  async function startAnalysis(regulationId: string) {
    try {
      setLastError(null);

      // optimistic: mark job running immediately
      setJobs((prev) =>
        prev.map((j) =>
          j.regulation_id === regulationId && j.total_clauses > 0
            ? { ...j, status: j.processed_clauses > 0 ? "running" : "running" }
            : j
        )
      );

      const { error } = await supabase.functions.invoke("reggio-analyze", {
        body: { regulation_id: regulationId, batch_size: 4 },
      });
      if (error) throw error;

      // refresh after trigger
      await loadAnalysisJobs();
    } catch (e: any) {
      setLastError(`startAnalysis: ${e.message || String(e)}`);
    }
  }

  // Re-analyze (uses RPC if present, otherwise just starts analysis)
  async function reanalyze(regulationId: string) {
    try {
      setLastError(null);

      // Try RPC (if you installed it). Soft-fail if missing/ambiguous.
      const { error: rpcErr } = await supabase.rpc("reset_clause_analysis", {
        p_regulation_id: regulationId,
        p_document_id: null,
        p_clear_generated: false,
      });
      if (rpcErr) {
        // Don’t block the flow — just surface info and carry on.
        setLastError(
          `reanalyze (rpc): ${rpcErr.message || String(
            rpcErr
          )} — continuing with a fresh analyze run.`
        );
      }

      await startAnalysis(regulationId);
    } catch (e: any) {
      setLastError(`reanalyze: ${e.message || String(e)}`);
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      await loadAnalysisJobs();
    } finally {
      setLoading(false);
    }
  }

  // --- Effects ---
  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const needsFast = jobs.some((j) => j.status === "running" || j.status === "ready");
    const interval = needsFast ? 3000 : 15000;
    const id = setInterval(loadAll, interval);
    return () => clearInterval(id);
  }, [autoRefresh, jobs]);

  // --- Derived ---
  const runnableCount = useMemo(
    () => jobs.filter((j) => j.status === "ready" || j.status === "running").length,
    [jobs]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Operator Dashboard</h1>
        <div className="flex gap-2">
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
              Statuses are normalized to: <b>ready</b> → <b>running</b> → <b>completed</b> →{" "}
              <b>failed</b> (with a <b>stalled</b> overlay when progress doesn’t move).
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

      {/* Jobs */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">AI Analysis Jobs</div>
          <Button
            onClick={async () => {
              // run all ready/running regs one by one with gentle pacing
              for (const j of jobs) {
                if (j.status === "ready" || j.status === "running") {
                  await startAnalysis(j.regulation_id);
                  await new Promise((r) => setTimeout(r, 1200));
                }
              }
            }}
            disabled={loading || runnableCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            Analyze All ({runnableCount})
          </Button>
        </div>

        <div className="grid gap-3">
          {jobs.map((job) => {
            const pct =
              job.total_clauses > 0
                ? Math.round((job.processed_clauses / job.total_clauses) * 100)
                : 0;

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
                      {job.last_analyzed_at
                        ? ` • Last analyzed: ${new Date(
                            job.last_analyzed_at
                          ).toLocaleString()}`
                        : ""}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <StatusChip status={job.status} stalled={job.stalled} />
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
                      title="Clear analysis markers (if RPC exists) and re-run"
                    >
                      <RotateCw className="h-4 w-4 mr-1" />
                      Re-analyze
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {jobs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No analysis jobs yet. Ingest a regulation (Node scraper) and refresh.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
