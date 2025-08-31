// src/pages/OperatorDashboard.tsx
// Operator Dashboard — AI Analysis focus (Analyze / Re-analyze / Bulk)
// Assumes DB view: public.analysis_jobs_v with columns:
//   regulation_id, regulation_title, regulation_short_code,
//   total_source_clauses, analyzed_clauses, last_analyzed_at
//
// Actions:
// - Analyze: invokes edge function 'reggio-analyze' for a single regulation
// - Re-analyze: calls RPC reggio.reset_clause_analysis(p_regulation_id, p_clear_generated)
//               then immediately invokes 'reggio-analyze'
// - Analyze All Pending: runs analyze for all regs not fully analyzed
//
// Notes:
// - Uses a synthetic `id` built from regulation_id for React keys
// - Shows stalling indicator when analyzed_clauses doesn’t move between polls
// - Keeps ingestion links accessible but secondary

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Brain, RefreshCw, RotateCw, Play } from "lucide-react";

type AnalysisStatus = "pending" | "running" | "completed";

type AnalysisJob = {
  id: string; // synthetic key: `analysis-${regulation_id}`
  regulation_id: string;
  regulation_title: string;
  regulation_short_code: string | null;
  total_clauses: number;
  processed_clauses: number;
  last_analyzed_at: string | null;
  status: AnalysisStatus;
};

function StatusChip({ status }: { status: AnalysisStatus }) {
  const tone =
    status === "completed"
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Track movement to detect stalling
  const lastProcessedRef = useRef<Record<string, number>>({});
  const stalledRef = useRef<Record<string, boolean>>({});

  // ------- Data Loader --------
  async function loadJobs() {
    setErrorMsg(null);
    const { data, error } = await supabase
      .from("analysis_jobs_v")
      .select(
        "regulation_id, regulation_title, regulation_short_code, total_source_clauses, analyzed_clauses, last_analyzed_at"
      )
      .order("regulation_title", { ascending: true });

    if (error) {
      setErrorMsg(error.message || String(error));
      setJobs([]);
      return;
    }

    const list: AnalysisJob[] =
      (data || []).map((row: any) => {
        const total = row.total_source_clauses || 0;
        const processed = row.analyzed_clauses || 0;
        let status: AnalysisStatus = "pending";
        if (total > 0 && processed < total) status = "running";
        if (total > 0 && processed >= total) status = "completed";

        return {
          id: `analysis-${row.regulation_id}`,
          regulation_id: row.regulation_id,
          regulation_title: row.regulation_title || "Unknown Regulation",
          regulation_short_code: row.regulation_short_code ?? null,
          total_clauses: total,
          processed_clauses: processed,
          last_analyzed_at: row.last_analyzed_at ?? null,
          status,
        };
      }) || [];

    // update stall detection
    list.forEach((job) => {
      const prev = lastProcessedRef.current[job.regulation_id];
      if (prev === undefined) {
        // first observation
        stalledRef.current[job.regulation_id] = false;
      } else {
        // mark stalled only if still pending/running and no progress
        const isActive = job.status === "pending" || job.status === "running";
        stalledRef.current[job.regulation_id] =
          isActive && job.processed_clauses === prev && job.processed_clauses > 0;
      }
      lastProcessedRef.current[job.regulation_id] = job.processed_clauses;
    });

    setJobs(list);
  }

  // ------- Actions --------
  async function startAnalysis(regulationId: string) {
    try {
      setErrorMsg(null);
      const { data, error } = await supabase.functions.invoke("reggio-analyze", {
        body: { regulation_id: regulationId, batch_size: 4 },
      });
      if (error) throw error;
      // Refresh immediately to reflect increments
      await loadJobs();
      return data;
    } catch (e: any) {
      setErrorMsg(`Analyze error: ${e.message || String(e)}`);
      return null;
    }
  }

  async function reanalyze(regulationId: string) {
    try {
      setErrorMsg(null);
      // Clear analysis markers + existing generated clauses for this regulation
      const { error: rpcError } = await supabase
        .schema("reggio")
        .rpc("reset_clause_analysis", {
          p_regulation_id: regulationId,
          p_clear_generated: true, // remove existing AI-generated rows to avoid duplicates
          p_document_id: null,
        });

      if (rpcError) throw rpcError;

      // Kick a new batch right away
      await startAnalysis(regulationId);
    } catch (e: any) {
      setErrorMsg(`Re-analyze error: ${e.message || String(e)}`);
    }
  }

  async function analyzeAllPending() {
    // process those not fully analyzed
    const targets = jobs.filter(
      (j) => j.status === "pending" || j.status === "running"
    );
    if (targets.length === 0) {
      setErrorMsg("No pending/running regulations to analyze.");
      return;
    }
    setErrorMsg(null);
    for (const job of targets) {
      await startAnalysis(job.regulation_id);
      // small spacing to avoid bursts
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  // ------- Effects --------
  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const anyActive = jobs.some(
      (j) => j.status === "pending" || j.status === "running"
    );
    const intervalMs = anyActive ? 3000 : 15000;
    const t = setInterval(loadJobs, intervalMs);
    return () => clearInterval(t);
  }, [autoRefresh, jobs]);

  const pendingCount = useMemo(
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
              Analyze scraped source clauses and track progress per regulation.
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
            <Button
              onClick={analyzeAllPending}
              disabled={pendingCount === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Brain className="h-4 w-4 mr-2" />
              Analyze All Pending ({pendingCount})
            </Button>
          </div>
        </div>
      </Card>

      {/* Errors */}
      {errorMsg && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Jobs */}
      <Card className="p-4">
        <div className="text-lg font-semibold mb-3">AI Analysis Jobs</div>
        <div className="grid gap-3">
          {jobs.map((job) => {
            const pct =
              job.total_clauses > 0
                ? Math.round((job.processed_clauses / job.total_clauses) * 100)
                : 0;

            const stalled = stalledRef.current[job.regulation_id] === true;

            return (
              <div key={job.id} className="border rounded-lg p-4">
                <div className="grid items-start gap-3 md:grid-cols-12">
                  {/* Title + meta */}
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

                  {/* Status */}
                  <div className="md:col-span-2 flex items-center gap-2">
                    <StatusChip status={job.status} />
                    {stalled && (
                      <span className="text-xs text-muted-foreground">stalled</span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="md:col-span-3">
                    <Progress value={pct} className="h-2 mb-1" />
                    <div className="text-xs text-muted-foreground">
                      {job.processed_clauses}/{job.total_clauses}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-2 flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startAnalysis(job.regulation_id)}
                      title="Run a batch analysis for this regulation"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Analyze
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reanalyze(job.regulation_id)}
                      title="Clear analysis markers (and generated clauses) then re-run"
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
              No analysis jobs yet. Ingest a regulation with your Node scraper and refresh.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
