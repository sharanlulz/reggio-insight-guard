// src/pages/OperatorDashboard.tsx
// Operator Dashboard — AI Analysis lifecycle with "ready → running → completed" + stalled detection.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Brain, RefreshCw, RotateCw, Play } from "lucide-react";

type AnalysisStatus = "ready" | "running" | "completed" | "failed";

type JobRow = {
  id: string;
  regulation_id: string;
  regulation_title: string;
  regulation_short_code: string | null;
  status: AnalysisStatus;
  totals: {
    total: number;
    analyzed: number;
    failed: number;
  };
  progressPct: number;
  stalled: boolean;
};

function StatusChip({ status }: { status: AnalysisStatus }) {
  const tone =
    status === "failed"
      ? "bg-red-100 text-red-800 border-red-200"
      : status === "completed"
      ? "bg-green-100 text-green-800 border-green-200"
      : status === "ready"
      ? "bg-gray-100 text-gray-800 border-gray-200"
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

  // --- Data loader ---
  async function loadJobs() {
    try {
      setLastError(null);

      const { data, error } = await supabase
        .from("analysis_jobs_v")
        .select("*")
        .order("regulation_title", { ascending: true });

      if (error) throw error;

      const jobs: JobRow[] = (data || []).map((row: any) => {
        const total = row.total_source_clauses || 0;
        const analyzed = row.analyzed_clauses || 0;
        const failed = row.failed_clauses || 0;

        let status: AnalysisStatus = "ready";
        if (total === 0) {
          status = "ready";
        } else if (analyzed >= total) {
          status = "completed";
        } else if (analyzed > 0 && analyzed < total) {
          status = "running";
        }

        const pct = total > 0 ? Math.round((analyzed / total) * 100) : 0;

        // stalled check
        const prev = lastProgress.current[row.regulation_id] ?? -1;
        const stalled = status === "running" && prev === analyzed && analyzed > 0;
        lastProgress.current[row.regulation_id] = analyzed;

        return {
          id: `job-${row.regulation_id}`,
          regulation_id: row.regulation_id,
          regulation_title: row.regulation_title,
          regulation_short_code: row.regulation_short_code,
          status,
          totals: { total, analyzed, failed },
          progressPct: pct,
          stalled,
        };
      });

      setJobs(jobs);
    } catch (e: any) {
      console.error("loadJobs error:", e);
      setLastError(e.message || String(e));
      setJobs([]);
    }
  }

  // --- Actions ---
  async function startAnalysis(regId: string) {
    try {
      const { error } = await supabase.functions.invoke("reggio-analyze", {
        body: { regulation_id: regId, batch_size: 4 },
      });
      if (error) throw error;
      await loadJobs();
    } catch (e: any) {
      setLastError(`startAnalysis: ${e.message || String(e)}`);
    }
  }

  async function reanalyze(regId: string) {
    try {
      const { error } = await supabase.rpc("reggio.reset_clause_analysis", {
        p_regulation_id: regId,
        p_clear_generated: true,
      });
      if (error) throw error;
      await startAnalysis(regId);
    } catch (e: any) {
      setLastError(`reanalyze: ${e.message || String(e)}`);
    }
  }

  // --- Effects ---
  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const hasRunning = jobs.some((j) => j.status === "running");
    const interval = hasRunning ? 4000 : 15000;
    const id = setInterval(loadJobs, interval);
    return () => clearInterval(id);
  }, [autoRefresh, jobs]);

  const runningCount = useMemo(
    () => jobs.filter((j) => j.status === "ready" || j.status === "running").length,
    [jobs]
  );

  // --- Render ---
  return (
    <div className="p-6 space-y-6">
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

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium">AI Analysis</div>
            <div className="text-sm text-muted-foreground">
              Lifecycle: <b>ready → running → completed</b>. Stalled = no progress despite being
              running.
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
              onClick={loadJobs}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {lastError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{lastError}</AlertDescription>
        </Alert>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">AI Analysis Jobs</div>
          <Button
            onClick={async () => {
              for (const j of jobs) {
                if (j.status === "ready" || j.status === "running") {
                  await startAnalysis(j.regulation_id);
                  await new Promise((r) => setTimeout(r, 1000));
                }
              }
            }}
            disabled={loading || runningCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            Analyze All ({runningCount})
          </Button>
        </div>

        <div className="grid gap-3">
          {jobs.map((j) => (
            <div key={j.id} className="border rounded-lg p-4">
              <div className="grid items-start gap-3 md:grid-cols-12">
                <div className="md:col-span-5">
                  <div className="font-medium">
                    {j.regulation_title}{" "}
                    {j.regulation_short_code && (
                      <span className="text-muted-foreground">({j.regulation_short_code})</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{j.totals.total} clauses</div>
                </div>

                <div className="md:col-span-2 flex items-center gap-2">
                  <StatusChip status={j.status} />
                  {j.stalled && (
                    <span className="text-xs text-muted-foreground">stalled</span>
                  )}
                </div>

                <div className="md:col-span-3">
                  <Progress value={j.progressPct} className="h-2 mb-1" />
                  <div className="text-xs text-muted-foreground">
                    {j.totals.analyzed}/{j.totals.total}
                  </div>
                </div>

                <div className="md:col-span-2 flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => startAnalysis(j.regulation_id)}>
                    <Play className="h-4 w-4 mr-1" />
                    Analyze
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reanalyze(j.regulation_id)}
                  >
                    <RotateCw className="h-4 w-4 mr-1" />
                    Re-analyze
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {jobs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No jobs yet. Ingest a regulation and refresh.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
