// src/pages/OperatorDashboard.tsx
// Enhanced Operator Dashboard with AI Analysis Integration

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Brain, Target, FileText, Play, Pause } from "lucide-react";

import IngestModal from "@/components/ingest/IngestModal";

type LegacyStatus = "running" | "succeeded" | "failed";
type SessionStatus = "pending" | "running" | "paused" | "succeeded" | "failed";
type AnalysisStatus = "pending" | "running" | "completed" | "failed";

type IngestRow = {
  id: string;
  regulation_document_id: string;
  status: LegacyStatus;
  chunks_total: number;
  chunks_done: number;
  error: string | null;
  finished_at: string | null;
  updated_at: string | null;
  version_label: string | null;
  regulation_id: string | null;
  regulation_title: string | null;
  regulation_short_code: string | null;
};

type SessionRow = {
  id: string;
  regulation_document_id: string | null;
  status: SessionStatus;
  chunks_total: number;
  chunks_processed: number;
  chunks_succeeded: number;
  chunks_failed: number;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  started_at: string;
  updated_at: string;
  finished_at: string | null;
  version_label?: string | null;
  regulation_title?: string | null;
  regulation_short_code?: string | null;
};

type AnalysisJob = {
  id: string;
  regulation_id: string;
  regulation_title: string;
  status: AnalysisStatus;
  total_clauses: number;
  processed_clauses: number;
  thresholds_extracted: number;
  obligations_extracted: number;
  stress_parameters_found: number;
  error_message: string | null;
  started_at: string;
  updated_at: string;
  finished_at: string | null;
};

type AnalysisResult = {
  clause_id: string;
  clause_number: string;
  thresholds_count: number;
  obligations_count: number;
  summary: string;
  risk_area: string;
  has_stress_parameters: boolean;
};

function StatusChip({ status }: { status: LegacyStatus | SessionStatus | AnalysisStatus }) {
  const tone =
    status === "failed"
      ? "bg-red-100 text-red-800 border-red-200"
      : status === "succeeded" || status === "completed"
      ? "bg-green-100 text-green-800 border-green-200"
      : status === "paused"
      ? "bg-gray-100 text-gray-800 border-gray-200"
      : status === "pending"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : "bg-blue-100 text-blue-800 border-blue-200";
  return (
    <Badge variant="outline" className={tone}>
      {status}
    </Badge>
  );
}

function ErrorNote({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <Alert variant="destructive" className="mt-3">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-sm">
        {text.length > 220 ? `${text.slice(0, 220)}…` : text}
      </AlertDescription>
    </Alert>
  );
}

function AnalysisJobCard({
  job,
  onStart,
  onPause,
  onResume,
}: {
  job: AnalysisJob;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const progressPercentage =
    job.total_clauses > 0 ? Math.round((job.processed_clauses / job.total_clauses) * 100) : 0;

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium">{job.regulation_title}</h3>
          <div className="text-sm text-muted-foreground">
            {job.total_clauses} clauses • Started {new Date(job.started_at).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={job.status} />
          {job.status === "pending" && (
            <Button size="sm" variant="outline" onClick={onStart}>
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
          {job.status === "running" && (
            <Button size="sm" variant="outline" onClick={onPause}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          {job.status === "paused" && (
            <Button size="sm" variant="outline" onClick={onResume}>
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>
            {job.processed_clauses}/{job.total_clauses} clauses
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {job.status === "completed" && (
        <div className="grid grid-cols-3 gap-4 mt-3 p-3 bg-green-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-700">{job.thresholds_extracted}</div>
            <div className="text-xs text-green-600">Thresholds</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-700">{job.obligations_extracted}</div>
            <div className="text-xs text-green-600">Obligations</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-700">{job.stress_parameters_found}</div>
            <div className="text-xs text-green-600">Stress Parameters</div>
          </div>
        </div>
      )}

      {job.error_message && <ErrorNote text={job.error_message} />}
    </div>
  );
}

function AnalysisResults({ results }: { results: AnalysisResult[] }) {
  if (results.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No analysis results to display</div>;
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <div key={result.clause_id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-medium">{result.clause_number}</h4>
              <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {result.risk_area}
            </Badge>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1 text-sm">
              <Target className="h-4 w-4 text-orange-600" />
              {result.thresholds_count} thresholds
            </div>
            <div className="flex items-center gap-1 text-sm">
              <FileText className="h-4 w-4 text-blue-600" />
              {result.obligations_count} obligations
            </div>
            {result.has_stress_parameters && (
              <div className="flex items-center gap-1 text-sm">
                <Brain className="h-4 w-4 text-purple-600" />
                Stress parameters
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OperatorDashboard() {
  const [useNewTracking, setUseNewTracking] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ingestion" | "analysis" | "results">("ingestion");

  const [legacyRows, setLegacyRows] = useState<IngestRow[]>([]);
  const [sessionRows, setSessionRows] = useState<SessionRow[]>([]);
  const [analysisJobs, setAnalysisJobs] = useState<AnalysisJob[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const lastProgress = useRef<Record<string, number>>({});

  async function loadLegacy() {
    const { data, error } = await supabase
      .from("ingestions_v")
      .select("*")
      .order("finished_at", { ascending: false })
      .limit(30);

    if (error) {
      setLastError(`Legacy load error: ${error.message || String(error)}`);
      setLegacyRows([]);
      return;
    }
    setLegacyRows((data || []) as IngestRow[]);
  }

  async function loadSessions() {
    const base = await supabase
      .from("ingestion_sessions")
      .select(
        "id, regulation_document_id, status, chunks_total, chunks_processed, chunks_succeeded, chunks_failed, retry_count, max_retries, error_message, started_at, updated_at, finished_at"
      )
      .order("started_at", { ascending: false })
      .limit(30);

    if (base.error) {
      setUseNewTracking(false);
      return;
    }
    const sessions = (base.data || []) as SessionRow[];
    if (sessions.length === 0) {
      setSessionRows([]);
      return;
    }

    const docIds = Array.from(
      new Set(sessions.map((s) => s.regulation_document_id).filter(Boolean) as string[])
    );

    const docsById: Record<string, { id: string; version_label: string | null; regulation_id: string | null }> = {};
    if (docIds.length) {
      const docs = await supabase
        .from("regulation_documents")
        .select("id, version_label, regulation_id")
        .in("id", docIds);

      if (!docs.error && docs.data) {
        docs.data.forEach((d: any) => {
          docsById[d.id] = {
            id: d.id,
            version_label: d.version_label ?? null,
            regulation_id: d.regulation_id ?? null,
          };
        });
      }
    }

    const regIds = Array.from(new Set(Object.values(docsById).map((d) => d.regulation_id).filter(Boolean) as string[]));

    const regsById: Record<string, { title: string | null; short_code: string | null }> = {};
    if (regIds.length) {
      const regs = await supabase.from("regulations").select("id, title, short_code").in("id", regIds);

      if (!regs.error && regs.data) {
        regs.data.forEach((r: any) => {
          regsById[r.id] = { title: r.title ?? null, short_code: r.short_code ?? null };
        });
      }
    }

    const hydrated = sessions.map((s) => {
      const doc = s.regulation_document_id ? docsById[s.regulation_document_id] : undefined;
      const reg = doc?.regulation_id ? regsById[doc.regulation_id] : undefined;
      return {
        ...s,
        version_label: doc?.version_label ?? null,
        regulation_title: reg?.title ?? null,
        regulation_short_code: reg?.short_code ?? null,
      };
    });

    setSessionRows(hydrated);
  }

  async function checkAnalysisStatus(regulationId: string): Promise<{
    needsAnalysis: boolean;
    totalClauses: number;
    analyzedClauses: number;
    lastAnalyzed?: string;
  }> {
    try {
      const { data: sourceClauses, error: sourceError } = await supabase
        .from("source_clauses")
        .select("id")
        .eq("regulation_id", regulationId);

      if (sourceError) throw sourceError;

      const { data: analyzedClauses, error: analyzedError } = await supabase
        .from("clauses")
        .select("id, created_at, metadata")
        .eq("regulation_id", regulationId);

      if (analyzedError) throw analyzedError;

      const totalClauses = sourceClauses?.length || 0;
      const analyzedCount =
        analyzedClauses?.filter((c: any) => c.metadata && c.metadata.analyzed_at)?.length || 0;
      const needsAnalysis = analyzedCount < totalClauses;

      const lastAnalyzed =
        analyzedClauses && analyzedClauses.length > 0
          ? analyzedClauses.reduce(
              (latest: string, clause: any) =>
                clause.created_at > latest ? clause.created_at : latest,
              analyzedClauses[0].created_at
            )
          : undefined;

      return {
        needsAnalysis,
        totalClauses,
        analyzedClauses: analyzedCount,
        lastAnalyzed,
      };
    } catch (error) {
      console.error("Error checking analysis status:", error);
      return { needsAnalysis: true, totalClauses: 0, analyzedClauses: 0 };
    }
  }

  async function loadAnalysisJobs() {
    try {
      const { data: regulationsWithData, error } = await supabase
        .from("source_clauses")
        .select(`regulation_id, regulations!inner(id, title, short_code)`)
        .not("regulation_id", "is", null);

      if (error) {
        console.error("Error loading regulations with data:", error);
        setAnalysisJobs([]);
        return;
      }

      const regulationMap = new Map<string, { title: string; short_code: string }>();
      regulationsWithData?.forEach((row: any) => {
        const regId = row.regulation_id as string;
        if (!regulationMap.has(regId)) {
          regulationMap.set(regId, {
            title: row.regulations.title,
            short_code: row.regulations.short_code,
          });
        }
      });

      const jobs: AnalysisJob[] = [];
      for (const [regId, regulation] of regulationMap.entries()) {
        const status = await checkAnalysisStatus(regId);

        const jobStatus: AnalysisStatus =
          status.analyzedClauses === 0
            ? "pending"
            : status.needsAnalysis
            ? "running"
            : "completed";

        jobs.push({
          id: `analysis-${regId}`,
          regulation_id: regId,
          regulation_title: regulation.title || "Unknown Regulation",
          status: jobStatus,
          total_clauses: status.totalClauses,
          processed_clauses: status.analyzedClauses,
          thresholds_extracted: 0,
          obligations_extracted: 0,
          stress_parameters_found: 0,
          error_message: null,
          started_at: status.lastAnalyzed || new Date().toISOString(),
          updated_at: status.lastAnalyzed || new Date().toISOString(),
          finished_at: !status.needsAnalysis ? status.lastAnalyzed || new Date().toISOString() : null,
        });
      }

      setAnalysisJobs(jobs);
    } catch (error) {
      console.error("Error loading analysis jobs:", error);
      setAnalysisJobs([]);
    }
  }

  // Placeholder data for the "Results" tab
  async function loadAnalysisResults() {
    const mockResults: AnalysisResult[] = [
      {
        clause_id: "clause-1",
        clause_number: "RULE_1",
        thresholds_count: 2,
        obligations_count: 3,
        summary:
          "Firms must maintain adequate capital where capital requirements are met and buffers are maintained",
        risk_area: "CAPITAL",
        has_stress_parameters: true,
      },
      {
        clause_id: "clause-2",
        clause_number: "RULE_2",
        thresholds_count: 1,
        obligations_count: 2,
        summary:
          "Distribution strategies must be affordable, sustainable and not adversely affect safety",
        risk_area: "OPERATIONAL",
        has_stress_parameters: false,
      },
    ];
    setAnalysisResults(mockResults);
  }

  async function startAnalysis(regulationId: string) {
    try {
      const status = await checkAnalysisStatus(regulationId);
      if (!status.needsAnalysis) {
        setLastError(
          `Analysis skipped: ${regulationId} is already fully analyzed (${status.analyzedClauses}/${status.totalClauses} clauses)`
        );
        return;
      }

      const { data, error } = await supabase.functions.invoke("reggio-analyze", {
        body: { regulation_id: regulationId, batch_size: 4 },
      });

      if (error) throw error;

      console.log("Analysis batch completed:", data);
      await loadAnalysisJobs();
    } catch (err: any) {
      setLastError(`Analysis error: ${err.message}`);
    }
  }

  async function startBulkAnalysis() {
    const pending = analysisJobs.filter((j) => j.status === "pending" || j.status === "running");
    if (pending.length === 0) {
      setLastError("No regulations require analysis");
      return;
    }

    for (const job of pending) {
      try {
        await startAnalysis(job.regulation_id);
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Failed to process ${job.regulation_title}:`, e);
      }
    }
  }

  async function pauseAnalysis(jobId: string) {
    console.log("Pausing analysis:", jobId);
  }
  async function resumeAnalysis(jobId: string) {
    console.log("Resuming analysis:", jobId);
  }

  async function loadData() {
    setLoading(true);
    setLastError(null);
    try {
      if (useNewTracking) {
        await loadSessions();
      } else {
        await loadLegacy();
      }
      await loadAnalysisJobs();
      await loadAnalysisResults();
    } catch (err: any) {
      setLastError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [useNewTracking]);

  useEffect(() => {
    if (!autoRefresh) return;
    const hasRunning = useNewTracking
      ? sessionRows.some((r) => r.status === "running" || r.status === "pending") ||
        analysisJobs.some((j) => j.status === "running" || j.status === "pending")
      : legacyRows.some((r) => r.status === "running");

    const interval = hasRunning ? 3000 : 15000;
    const id = setInterval(loadData, interval);
    return () => clearInterval(id);
  }, [autoRefresh, useNewTracking, sessionRows, legacyRows, analysisJobs]);

  async function resumeSession(sessionId: string) {
    const { error } = await supabase.rpc("resume_ingestion_session", { session_id: sessionId });
    if (error) {
      setLastError(`Resume error: ${error.message || String(error)}`);
    } else {
      loadData();
    }
  }

  const rows = useNewTracking ? sessionRows : legacyRows;
  const hasActive = useNewTracking
    ? sessionRows.some((r) => r.status === "running" || r.status === "pending") ||
      analysisJobs.some((j) => j.status === "running" || j.status === "pending")
    : legacyRows.some((r) => r.status === "running");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Operator Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIngestOpen(true)}>Ingest Document</Button>
          <Link to="/operator-versions">
            <Button variant="outline">Manage Versions</Button>
          </Link>
          <Link to="/operator-ingestions">
            <Button variant="outline">Ingestion Logs</Button>
          </Link>
        </div>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium">Tracking Mode</div>
            <div className="text-sm text-muted-foreground">
              {useNewTracking ? "Enhanced sessions" : "Legacy ingestions"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setUseNewTracking((v) => !v)}>
              Switch to {useNewTracking ? "Legacy" : "Enhanced"}
            </Button>
            <Button variant={autoRefresh ? "default" : "outline"} onClick={() => setAutoRefresh((v) => !v)}>
              {autoRefresh ? "Auto-Refresh: On" : "Auto-Refresh: Off"}
            </Button>
            <Button variant="outline" onClick={loadData} disabled={loading} className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabbed Interface */}
      <div className="w-full">
        <div className="flex space-x-1 mb-4 border-b">
          <button
            onClick={() => setActiveTab("ingestion")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === "ingestion"
                ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Data Ingestion
          </button>
          <button
            onClick={() => setActiveTab("analysis")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === "analysis"
                ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            AI Analysis
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === "results"
                ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Analysis Results
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "ingestion" && (
          <Card className="p-4">
            <div className="mb-3 text-lg font-semibold">
              {useNewTracking ? "Ingestion Sessions" : "Recent Ingestions"}
            </div>

            {lastError && (
              <Alert variant="destructive" className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{lastError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3">
              {rows.map((row: any) => {
                const isNew = "chunks_processed" in row;
                const title = (row.regulation_title as string) || "";
                const shortCode = (row.regulation_short_code as string) || "";
                const versionLabel = (row.version_label as string) || "—";
                const status = row.status as LegacyStatus | SessionStatus;
                const finishedAt = row.finished_at ? new Date(row.finished_at).toLocaleString() : "—";

                const total = row.chunks_total;
                const done = isNew ? row.chunks_processed : row.chunks_done;
                const success = isNew ? row.chunks_succeeded ?? 0 : undefined;
                const failed = isNew ? row.chunks_failed ?? 0 : undefined;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                const prev = lastProgress.current[row.id] ?? -1;
                const stalled = status === "running" && prev === done && done > 0;
                lastProgress.current[row.id] = done;

                return (
                  <div key={row.id} className="border rounded-lg p-4">
                    <div className="grid items-start gap-3 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <div className="font-medium">
                          {title ? (
                            <>
                              {title}
                              {shortCode ? <span className="text-muted-foreground"> ({shortCode})</span> : null}
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">Untitled</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">Version: {versionLabel}</div>
                      </div>

                      <div className="md:col-span-2 flex items-center gap-2">
                        <StatusChip status={status} />
                        {stalled && <span className="text-xs text-muted-foreground">stalled</span>}
                      </div>

                      <div className="md:col-span-4">
                        <Progress value={pct} className="h-2 mb-1" />
                        <div className="text-xs text-muted-foreground">
                          {done}/{total}
                          {isNew ? (
                            <>
                              {" "}({success} ✓, {failed} ✗)
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="md:col-span-2 text-sm">{finishedAt}</div>
                    </div>

                    {isNew && status === "failed" && row.retry_count < row.max_retries && (
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={() => resumeSession(row.id)}>
                          Resume
                        </Button>
                      </div>
                    )}

                    <ErrorNote text={isNew ? row.error_message : row.error} />
                  </div>
                );
              })}

              {!loading && rows.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No items yet. Start an ingestion to see progress here.
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === "analysis" && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">AI Analysis Jobs</div>
              <Button
                onClick={startBulkAnalysis}
                disabled={
                  loading ||
                  analysisJobs.filter((job) => job.status === "pending" || job.status === "running").length === 0
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Brain className="h-4 w-4 mr-2" />
                Analyze All Pending (
                {analysisJobs.filter((job) => job.status === "pending" || job.status === "running").length})
              </Button>
            </div>

            <div className="space-y-3">
              {analysisJobs.length > 0 ? (
                analysisJobs.map((job) => (
                  <AnalysisJobCard
                    key={job.id}
                    job={job}
                    onStart={() => startAnalysis(job.regulation_id)}
                    onPause={() => pauseAnalysis(job.id)}
                    onResume={() => resumeAnalysis(job.id)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No analysis jobs yet. Complete an ingestion and start analysis.
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === "results" && (
          <Card className="p-4">
            <div className="mb-3 text-lg font-semibold">Analysis Results</div>
            <AnalysisResults results={analysisResults} />
          </Card>
        )}
      </div>

      {autoRefresh && hasActive && (
        <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Auto-refreshing every 3–15 seconds…
        </div>
      )}

      <IngestModal open={ingestOpen} onClose={() => setIngestOpen(false)} />
    </div>
  );
}
