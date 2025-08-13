import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  updated_at?: string | null;
  error: string | null;
  version_label: string | null;
  regulation_id: string;
  regulation_title: string;
  regulation_short_code: string;
};

function StatusBadge({ status }: { status: IngestRow["status"] }) {
  const map: Record<string, "secondary" | "success" | "destructive" | "outline"> = {
    running: "secondary",
    succeeded: "success",
    failed: "destructive",
  };
  // @ts-ignore
  return <Badge variant={map[status] || "outline"}>{status}</Badge>;
}

export default function OperatorDashboard() {
  const [ing, setIng] = useState<IngestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingestOpen, setIngestOpen] = useState(false);

  async function loadIngestions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ingestions_v") // public view
      .select("*")
      .order("finished_at", { ascending: false })
      .limit(50);

    if (!error && data) setIng(data as IngestRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadIngestions();
    const t = setInterval(loadIngestions, 5000);
    return () => clearInterval(t);
  }, []);

  const anyRunning = useMemo(() => ing.some((r) => r.status === "running"), [ing]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
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

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Recent Ingestions</div>
          <Button variant="outline" onClick={loadIngestions} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="grid gap-3">
          {ing.map((r) => {
            const pct = r.chunks_total ? Math.round((r.chunks_done / r.chunks_total) * 100) : 0;
            const finished = r.finished_at ? new Date(r.finished_at).toLocaleString() : "—";
            const updatedAgo =
              r.updated_at ? Math.round((Date.now() - new Date(r.updated_at).getTime()) / 1000) : null;
            const waiting = r.status === "running" && updatedAgo !== null && updatedAgo > 10;

            return (
              <div key={r.id} className="grid items-center gap-3 md:grid-cols-6 border rounded-lg p-3">
                <div className="md:col-span-2">
                  <div className="font-medium">
                    {r.regulation_title}{" "}
                    <span className="text-muted-foreground">({r.regulation_short_code})</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Version: {r.version_label ?? "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  {waiting && <span className="text-xs text-muted-foreground">· backing off…</span>}
                </div>
                <div className="md:col-span-2">
                  <Progress value={pct} className="h-2" />
                  <div className="text-xs mt-1">
                    {r.chunks_done}/{r.chunks_total}
                  </div>
                </div>
                <div className="text-sm">{finished}</div>
              </div>
            );
          })}
          {!ing.length && (
            <div className="text-sm text-muted-foreground">No runs found.</div>
          )}
        </div>

        {anyRunning && (
          <div className="mt-3 text-xs text-muted-foreground">
            Auto-refreshing… (every 5s while a run is active)
          </div>
        )}
      </Card>

      <IngestModal open={ingestOpen} onClose={() => setIngestOpen(false)} />
    </div>
  );
}
