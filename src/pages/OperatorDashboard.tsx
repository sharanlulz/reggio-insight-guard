// Enhanced Operator Dashboard with reliability features
// REPLACE ENTIRE CONTENTS of: src/pages/OperatorDashboard.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import IngestModal from "@/components/ingest/IngestModal";

type IngestRow = {
  id: string;
  regulation_document_id: string;
  status: "running" | "succeeded" | "failed";
  chunks_total: number;
  chunks_done: number;
  ratio_tagged_count: number | null;
  jurisdiction_tagged_count: number | null;
  finished_at: string | null;
  updated_at: string | null;
  error: string | null;
  version_label: string | null;
  regulation_id: string;
  regulation_title: string;
  regulation_short_code: string;
};

type SessionRow = {
  id: string;
  regulation_document_id: string;
  status: "pending" | "running" | "paused" | "succeeded" | "failed";
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
  // Joined data
  regulation_title?: string;
  regulation_short_code?: string;
  version_label?: string;
};

function StatusBadge({ status }: { status: IngestRow["status"] | SessionRow["status"] }) {
  const variants = {
    pending: "secondary" as const,
    running: "secondary" as const,
    paused: "outline" as const,
    succeeded: "default" as const, // Using "default" instead of "success" for compatibility
    failed: "destructive" as const,
  };
  
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    running: "bg-blue-100 text-blue-800",
    paused: "bg-gray-100 text-gray-800",
    succeeded: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <Badge 
      variant={variants[status as keyof typeof variants] || "outline"}
      className={colors[status as keyof typeof colors]}
    >
      {status}
    </Badge>
  );
}

function ErrorAlert({ error }: { error: string }) {
  return (
    <Alert variant="destructive" className="mt-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-sm">
        {error.length > 100 ? `${error.slice(0, 100)}...` : error}
      </AlertDescription>
    </Alert>
  );
}

export default function OperatorDashboard() {
  const [ingestions, setIngestions] = useState<IngestRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [useNewTracking, setUseNewTracking] = useState(true);

  // Track movement for backing off detection
  const lastProgress = useRef<Record<string, number>>({});

  async function loadOldIngestions() {
    try {
      const { data, error } = await supabase
        .from("ingestions_v")
        .select("*")
        .order("finished_at", { ascending: false })
        .limit(25);

      if (!error && data) {
        setIngestions(data as IngestRow[]);
      }
    } catch (error) {
      console.error("Failed to load old ingestions:", error);
    }
  }

  async function loadNewSessions() {
    try {
      // Load ingestion sessions with joined regulation data
      const { data, error } = await supabase
        .from("ingestion_sessions")
        .select(`
          *,
          regulation_documents!inner (
            version_label,
            regulations!inner (
              title,
              short_code
            )
          )
        `)
        .order("started_at", { ascending: false })
        .limit(25);

      if (!error && data) {
        const formatted = data.map((row: any) => ({
          ...row,
          regulation_title: row.regulation_documents?.regulations?.title || "Unknown",
          regulation_short_code: row.regulation_documents?.regulations?.short_code || "UNK",
          version_label: row.regulation_documents?.version_label || null,
        }));
        setSessions(formatted as SessionRow[]);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      // Fall back to old tracking if new tables don't exist yet
      setUseNewTracking(false);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      if (useNewTracking) {
        await loadNewSessions();
      } else {
        await loadOldIngestions();
      }
    } finally {
      setLoading(false);
    }
  }

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [useNewTracking]);

  // Auto-refresh with adaptive polling
  useEffect(() => {
    const hasRunning = useNewTracking 
      ? sessions.some(s => s.status === "running" || s.status === "pending")
      : ingestions.some(i => i.status === "running");
    
    const intervalMs = hasRunning ? 3000 : 15000;
    const timer = setInterval(loadData, intervalMs);
    return () => clearInterval(timer);
  }, [sessions, ingestions, useNewTracking]);

  async function resumeSession(sessionId: string) {
    try {
      const { error } = await supabase.rpc("resume_ingestion_session", {
        session_id: sessionId
      });

      if (error) {
        console.error("Resume failed:", error);
      } else {
        loadData(); // Refresh the list
      }
    } catch (error) {
      console.error("Resume error:", error);
    }
  }

  const displayData = useNewTracking ? sessions : ingestions;
  const hasActive = displayData.some(row => 
    row.status === "running" || row.status === "pending"
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Operator Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIngestOpen(true)}>
            Ingest Document
          </Button>
          <Link to="/operator-versions">
            <Button variant="outline">Manage Versions</Button>
          </Link>
          <Link to="/operator-ingestions">
            <Button variant="outline">Ingestion Logs</Button>
          </Link>
        </div>
      </div>

      {/* Tracking Mode Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Tracking Mode</h3>
            <p className="text-sm text-muted-foreground">
              {useNewTracking ? "Enhanced tracking with session management" : "Legacy ingestion tracking"}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setUseNewTracking(!useNewTracking)}
          >
            Switch to {useNewTracking ? "Legacy" : "Enhanced"}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">
            {useNewTracking ? "Ingestion Sessions" : "Recent Ingestions"}
          </div>
          <Button 
            variant="outline" 
            onClick={loadData} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3">
          {displayData.map((row) => {
            // Handle both old and new data structures
            const isNewSession = 'chunks_processed' in row;
            
            let progress = 0;
            let progressText = "";
            let title = "";
            let shortCode = "";
            let versionLabel = "";
            let finishedAt = "";
            
            if (isNewSession) {
              const session = row as SessionRow;
              progress = session.chunks_total > 0 
                ? Math.round((session.chunks_processed / session.chunks_total) * 100)
                : 0;
              progressText = `${session.chunks_processed}/${session.chunks_total} (${session.chunks_succeeded} ✓, ${session.chunks_failed} ✗)`;
              title = session.regulation_title || "Unknown";
              shortCode = session.regulation_short_code || "UNK";
              versionLabel = session.version_label || "—";
              finishedAt = session.finished_at ? new Date(session.finished_at).toLocaleString() : "—";
            } else {
              const ingestion = row as IngestRow;
              progress = ingestion.chunks_total > 0 
                ? Math.round((ingestion.chunks_done / ingestion.chunks_total) * 100)
                : 0;
              progressText = `${ingestion.chunks_done}/${ingestion.chunks_total}`;
              title = ingestion.regulation_title;
              shortCode = ingestion.regulation_short_code;
              versionLabel = ingestion.version_label || "—";
              finishedAt = ingestion.finished_at ? new Date(ingestion.finished_at).toLocaleString() : "—";
            }

            // Detect stalling
            const key = row.id;
            const currentProgress = isNewSession ? (row as SessionRow).chunks_processed : (row as IngestRow).chunks_done;
            const prevProgress = lastProgress.current[key] ?? -1;
            const isStalling = row.status === "running" && currentProgress === prevProgress && currentProgress > 0;
            lastProgress.current[key] = currentProgress;

            return (
              <div key={row.id} className="border rounded-lg p-4">
                <div className="grid items-start gap-3 md:grid-cols-12">
                  {/* Title and metadata */}
                  <div className="md:col-span-4">
                    <div className="font-medium">
                      {title} <span className="text-muted-foreground">({shortCode})</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Version: {versionLabel}
                    </div>
                    {isNewSession && (row as SessionRow).retry_count > 0 && (
                      <div className="text-xs text-yellow-600">
                        Retries: {(row as SessionRow).retry_count}/{(row as SessionRow).max_retries}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="md:col-span-2 flex items-center gap-2">
                    <StatusBadge status={row.status} />
                    {isStalling && (
                      <span className="text-xs text-muted-foreground">stalled</span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="md:col-span-3">
                    <Progress value={progress} className="h-2 mb-1" />
                    <div className="text-xs text-muted-foreground">
                      {progressText}
                    </div>
                  </div>

                  {/* Finished time */}
                  <div className="md:col-span-2 text-sm">
                    {finishedAt}
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-1">
                    {isNewSession && row.status === "failed" && (row as SessionRow).retry_count < (row as SessionRow).max_retries && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resumeSession(row.id)}
                      >
                        Resume
                      </Button>
                    )}
                  </div>
                </div>

                {/* Error display */}
                {row.status === "failed" && (
                  <ErrorAlert error={
                    isNewSession 
                      ? (row as SessionRow).error_message || "Unknown error" 
                      : (row as IngestRow).error || "Unknown error"
                  } />
                )}
              </div>
            );
          })}

          {displayData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? "Loading..." : "No ingestions found"}
            </div>
          )}
        </div>

        {hasActive && (
          <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            Auto-refreshing every 3 seconds while processing...
          </div>
        )}
      </Card>

      <IngestModal open={ingestOpen} onClose={() => setIngestOpen(false)} />
    </div>
  );
}
