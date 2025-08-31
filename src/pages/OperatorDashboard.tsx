// src/pages/OperatorDashboard.tsx
// Operator Dashboard focused on AI Analysis (with re-analyze)
// - Lists regs that have source_clauses (via a public view)
// - Shows analysis progress
// - One-click Analyze and Re-analyze
// - Keeps ingestion tucked away (still accessible)

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

type AnalysisJob = {
  id: string;
  regulation_id: string;
  regulation_title: string;
  regulation_short_code: string | null;
  status: AnalysisStatus;
  total_clauses: number;
  processed_clauses: number;
  error_message: string | null;
  started_at: string | null;
  updated_at: string | null;
  finished_at: string | null;
};

// Small helper: consistent badge tone
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
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const lastProgress = useRef<Record<string, number>>({});

  // --- Data loaders ---

  // Count unanalyzed vs analyzed for a regulation
  async function getRegAnalysisStatus(regId: string) {
    // total source clauses
    const totalQ = await supabase
      .schema("reggio")
      .from("source_clauses")
      .select("id", { count: "exact", head: true })
      .eq("regulation_id", regId);

    // analyzed: we consider metadata->analyzed_at not null OR analysis_status='completed'
    const analyzedQ = await supabase
      .schema("reggio")
      .from("source_clauses")
      .select("id", { count: "exact", head: true })
      .eq("regulation_id", regId)
      .not("metadata->>analyzed_at", "is", null);

    const total = Number(totalQ.count || 0);
    const analyzed = Number(analyzedQ.count || 0);
    const needs = analyzed < total;
    return { total, analyzed, needs };
  }

  async function loadAnalysisJobs() {
  try {
    const { data, error } = await supabase
      .from('analysis_jobs_v')
      .select('*')
      .order('regulation_title', { ascending: true });

    if (error) throw error;

    const jobs = (data || []).map((row: any) => ({
      id: `analysis-${row.regulation_id}`,
      regulation_id: row.regulation_id,
      regulation_title: row.regulation_title,
      status:
        row.total_source_clauses === 0
          ? ('pending' as const)
          : row.analyzed_clauses >= row.total_source_clauses
          ? ('completed' as const)
          : ('running' as const),
      total_clauses: row.total_source_clauses,
      processed_clauses: row.analyzed_clauses,
      thresholds_extracted: 0,
      obligations_extracted: 0,
      stress_parameters_found: 0,
      error_message: null,
      started_at: row.last_analyzed_at || new Date(0).toISOString(),
      updated_at: row.last_analyzed_at || new Date(0).toISOString(),
      finished_at:
        row.analyzed_clauses >= row.total_source_clauses
          ? row.last_analyzed_at
          : null,
    }));

    setAnalysisJobs(jobs);
  } catch (e: any) {
    console.error('Error loading analysis jobs:', e);
    setAnalysisJobs([]);
    setLastError(e.message || String(e));
  }
}
    const regs = data || [];

    // Build AnalysisJob rows
    const list: AnalysisJob[] = [];
    for (const r of regs) {
      const { total, analyzed, needs } = await getRegAnalysisStatus(
        r.regulation_id
      );

      const status: AnalysisStatus =
        analyzed === 0 ? "pending" : needs ? "running" : "completed";

      list.push({
        id: `analysis-${r.regulation_id}`,
        regulation_id: r.regulation_id,
        regulation_title: r.regulation_title || "Unknown Regulation",
        regulation_short_code: r.regulation_short_code || null,
        status,
        total_clauses: total,
        processed_clauses: analyzed,
        error_message: null,
        started_at: null,
        updated_at: null,
        finished_at: !needs ? new Date().toISOString() : null,
      });
    }

    setJobs(list);
  }

  // --- Actions ---

  // Start one regulation analysis (batch)
  async function startAnalysis(regulationId: string) {
    try {
      setLastError(null);
      const { data, error } = await supabase.functions.invoke("reggio-analyze", {
        body: { regulation_id: regulationId, batch_size: 4 },
      });
      if (error) throw error;
      // update UI
      await loadAnalysisJobs();
    } catch (e: any) {
      setLastError(`startAnalysis: ${e.message || String(e)}`);
    }
  }

  // Re-analyze = clear analysis markers for that regulation, then start
  async function reanalyze(regulationId: string) {
    try {
      setLastError(null);
      // Clear analysis markers in source_clauses for this regulation
      const { error: upErr } = await supabase
        .schema("reggio")
        .from("source_clauses")
        .update({
          // remove old flags but keep original text
          metadata: supabase.rpc
            ? undefined // (RPC not used; do below with jsonb_set pattern if needed)
            : undefined,
        })
        .eq("regulation_id", regulationId);

      // If you want a proper wipe of markers while preserving other metadata,
      // do it with an RPC or multiple updates; simpler: set analyzed_at/status to null:
      // Workaround: two updates to surgically remove keys if your DB policy allows:
      await supabase
        .schema("reggio")
        .from("source_clauses")
        .update({
          // set specific keys to null-friendly state
          // (if your DB uses computed metadata, replace with proper RPC)
          metadata: null,
        })
        .eq("regulation_id", regulationId)
        .is("metadata", null);

      // Kick a batch right away
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
    const hasRunning = jobs.some(
      (j) => j.status === "pending" || j.status === "running"
    );
    const interval = hasRunning ? 3000 : 15000;
    const id = setInterval(loadAll, interval);
    return () => clearInterval(id);
  }, [autoRefresh, jobs]);

  // --- Render ---

  const runningCount = useMemo(
    () => jobs.filter((j) => j.status === "pending" || j.status === "running").length,
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
              Works directly on your scraped source clauses.
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
                if (j.status === "pending" || j.status === "running") {
                  await startAnalysis(j.regulation_id);
                  await new Promise((r) => setTimeout(r, 1200));
                }
              }
            }}
            disabled={loading || runningCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            Analyze All Pending ({runningCount})
          </Button>
        </div>

        <div className="grid gap-3">
          {jobs.map((job) => {
            const pct =
              job.total_clauses > 0
                ? Math.round((job.processed_clauses / job.total_clauses) * 100)
                : 0;

            // Stalling indicator
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
                      <span className="text-xs text-muted-foreground">stalled</span>
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
                  <div className="mt-2 text-xs text-red-600">{job.error_message}</div>
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
      </Card>
    </div>
  );
}
