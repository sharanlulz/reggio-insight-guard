// src/pages/OperatorDashboard.tsx
// Operator Dashboard focused on AI Analysis with status aliasing
// New UX statuses: ready → running → completed → failed (+ stalled overlay)

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Brain, RefreshCw, RotateCw, Play } from "lucide-react";

// --- Types (kept broad so we don't break if the view/schema varies) ---
type RawJobRow = {
  regulation_id: string;
  regulation_title: string;
  regulation_short_code?: string | null;
  // counts from view
  total_source_clauses?: number | null;
  analyzed_clauses?: number | null;
  last_analyzed_at?: string | null;
  // optional backend/legacy status we may get from somewhere
  status?: string | null;
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

// --- Normalize to ready/running/completed/failed without changing backend ---
function normalizeStatus(raw: RawJobRow): UiStatus {
  const total = Number(raw.total_source_clauses ?? 0);
  const analyzed = Number(raw.analyzed_clauses ?? 0);
  const backend = (raw.status || "").toLowerCase();

  // Completed when analyzed >= total (and there is something to analyze)
  if (total > 0 && analyzed >= total) return "completed";

  // If nothing analyzed yet but content exists → ready
  if (total > 0 && analyzed === 0) return "ready";

  // If some analyzed but not all → running
  if (total > 0 && analyzed > 0 && analyzed < total) return "running";

  // If backend says failed, surface it
  if (backend === "failed") return "failed";

  // Default to ready (safe)
  return "ready";
}

export default function OperatorDashboard() {
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  // track progress across refreshes → detect "stalled"
  const lastProgress = useRef<Record<string, number>>({});

  // --- Load from public view (no backend changes required) ---
  async function loadAnalysisJobs() {
    setLastError(null);
    const { data, error } = await supabase
      .from("analysis_jobs_v") // your view
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

      // compute stalled: if status is running and processed hasn't moved since last refresh
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
      const { data, error } = await supabase.functions.invoke("reggio-analyze", {
        body: { regulation_id: regulationId, batch_size: 4 },
      });
      if (error) throw error;
      // refresh view immediately after triggering
      await loadAnalysisJobs();
    } catch (e: any) {
      setLastError(`startAnalysis: ${e.message || String(e)}`);
    }
  }

  // Optional: Re-analyze (only if you already installed the RPC; otherwise this will no-op)
  async function reanalyze(regulationId: string) {
    try {
      setLastError(null);
      // Try named-arg call first (if your function exists)
      const { error: rpcErr } = await supabase.rpc("reset_clause_analysis", {
        p_regulation_id: regulationId,
        p_document_id: null,
        p_clear_generated: false,
      });
      if (rpcErr) {
        // Soft-fail: show message but keep the page working
        setLastError(
          `reanalyze (rpc): ${rpcErr.message || String(rpcErr)} — You can still run “Analyze” to continue.`
        );
      }
      // kick analysis
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
    const hasRunning = jobs.some((j) => j.status === "running" || j.status === "ready");
    const interval = hasRunning ? 3000 : 15000;
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
              Statuses are normalized to: <b>ready</b> → <b>running</b> → <b>completed</b> → <b>failed</b> (with stalled overlay).
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
              for (const j of jobs) {
                if (j.status === "ready" || j.status === "running") {
                  await startAnalysis(j.regulation_id);
                  await new Promise((r) => setTimeout(r, 1200)); // gentle pacing
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
                        <span className="text-muted-foreground">({job.regulation_short_code})</span>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.total_clauses} clauses
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
