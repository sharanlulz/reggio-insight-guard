// src/pages/OperatorDashboard.tsx
// Operator Dashboard — robust fallback joins, safer visuals, auto-refresh toggle

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";

import IngestModal from "@/components/ingest/IngestModal";

type LegacyStatus = "running" | "succeeded" | "failed";
type SessionStatus = "pending" | "running" | "paused" | "succeeded" | "failed";

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
  // joined/fallback
  version_label?: string | null;
  regulation_title?: string | null;
  regulation_short_code?: string | null;
};

function StatusChip({ status }: { status: LegacyStatus | SessionStatus }) {
  const tone =
    status === "failed"
      ? "bg-red-100 text-red-800 border-red-200"
      : status === "succeeded"
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

export default function OperatorDashboard() {
  const [useNewTracking, setUseNewTracking] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ingestOpen, setIngestOpen] = useState(false);

  const [legacyRows, setLegacyRows] = useState<IngestRow[]>([]);
  const [sessionRows, setSessionRows] = useState<SessionRow[]>([]);
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

  // Fallback-aware loader for new ingestion_sessions
  async function loadSessions() {
    // Try a minimal, safe select (without deep joins)
    const base = await supabase
      .from("ingestion_sessions")
      .select(
        "id, regulation_document_id, status, chunks_total, chunks_processed, chunks_succeeded, chunks_failed, retry_count, max_retries, error_message, started_at, updated_at, finished_at"
      )
      .order("started_at", { ascending: false })
      .limit(30);

    if (base.error) {
      // Probably table doesn't exist -> flip to legacy
      setUseNewTracking(false);
      return;
    }
    const sessions = (base.data || []) as SessionRow[];
    if (sessions.length === 0) {
      setSessionRows([]);
      return;
    }

    // Fetch joined bits in 2 steps to avoid brittle deep-join syntax variations
    const docIds = Array.from(
      new Set(
        sessions
          .map((s) => s.regulation_document_id)
          .filter(Boolean) as string[]
      )
    );

    let docsById: Record<
      string,
      { id: string; version_label: string | null; regulation_id: string | null }
    > = {};
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

    const regIds = Array.from(
      new Set(
        Object.values(docsById)
          .map((d) => d.regulation_id)
          .filter(Boolean) as string[]
      )
    );

    let regsById: Record<string, { title: string | null; short_code: string | null }> = {};
    if (regIds.length) {
      const regs = await supabase
        .from("regulations")
        .select("id, title, short_code")
        .in("id", regIds);

      if (!regs.error && regs.data) {
        regs.data.forEach((r: any) => {
          regsById[r.id] = {
            title: r.title ?? null,
            short_code: r.short_code ?? null,
          };
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

  async function loadData() {
    setLoading(true);
    setLastError(null);
    try {
      if (useNewTracking) {
        await loadSessions();
      } else {
        await loadLegacy();
      }
    } catch (err: any) {
      setLastError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useNewTracking]);

  useEffect(() => {
    if (!autoRefresh) return;
    const hasRunning = useNewTracking
      ? sessionRows.some((r) => r.status === "running" || r.status === "pending")
      : legacyRows.some((r) => r.status === "running");

    const interval = hasRunning ? 3000 : 15000;
    const id = setInterval(loadData, interval);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, useNewTracking, sessionRows, legacyRows]);

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
    ? sessionRows.some((r) => r.status === "running" || r.status === "pending")
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
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh((v) => !v)}
            >
              {autoRefresh ? "Auto-Refresh: On" : "Auto-Refresh: Off"}
            </Button>
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* List */}
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

            // normalize fields
            const title = (row.regulation_title as string) || "";
            const shortCode = (row.regulation_short_code as string) || "";
            const versionLabel = (row.version_label as string) || "—";

            const status = row.status as LegacyStatus | SessionStatus;
            const finishedAt = row.finished_at
              ? new Date(row.finished_at).toLocaleString()
              : "—";

            // progress
            const total = isNew ? row.chunks_total : row.chunks_total;
            const done = isNew ? row.chunks_processed : row.chunks_done;
            const success = isNew ? row.chunks_succeeded ?? 0 : undefined;
            const failed = isNew ? row.chunks_failed ?? 0 : undefined;

            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            // stall detection
            const prev = lastProgress.current[row.id] ?? -1;
            const stalled = status === "running" && prev === done && done > 0;
            lastProgress.current[row.id] = done;

            return (
              <div key={row.id} className="border rounded-lg p-4">
                <div className="grid items-start gap-3 md:grid-cols-12">
                  {/* Title/meta */}
                  <div className="md:col-span-4">
                    <div className="font-medium">
                      {title ? (
                        <>
                          {title}
                          {shortCode ? (
                            <span className="text-muted-foreground"> ({shortCode})</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">Untitled</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Version: {versionLabel}</div>
                  </div>

                  {/* Status */}
                  <div className="md:col-span-2 flex items-center gap-2">
                    <StatusChip status={status} />
                    {stalled && (
                      <span className="text-xs text-muted-foreground">stalled</span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="md:col-span-4">
                    <Progress value={pct} className="h-2 mb-1" />
                    <div className="text-xs text-muted-foreground">
                      {done}/{total}
                      {isNew ? (
                        <>
                          {" "}
                          ({success} ✓, {failed} ✗)
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Finished */}
                  <div className="md:col-span-2 text-sm">{finishedAt}</div>
                </div>

                {/* Actions */}
                {isNew && status === "failed" && row.retry_count < row.max_retries && (
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={() => resumeSession(row.id)}>
                      Resume
                    </Button>
                  </div>
                )}

                {/* Error */}
                {isNew ? (
                  <ErrorNote text={row.error_message} />
                ) : (
                  <ErrorNote text={row.error} />
                )}
              </div>
            );
          })}

          {!loading && rows.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No items yet. Start an ingestion to see progress here.
            </div>
          )}
        </div>

        {autoRefresh && hasActive && (
          <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Auto-refreshing every {useNewTracking ? "3" : "3"}–15 seconds…
          </div>
        )}
      </Card>

      <IngestModal open={ingestOpen} onClose={() => setIngestOpen(false)} />
    </div>
  );
}
