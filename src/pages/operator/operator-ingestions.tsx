import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withRetry } from "@/lib/supaRetry";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type IngestRow = {
  id: string;
  regulation_title: string;
  regulation_short_code: string;
  version_label: string | null;
  status: "running" | "succeeded" | "failed";
  chunks_total: number;
  chunks_done: number;
  finished_at: string | null;
  updated_at?: string | null;
  error: string | null;
};

function StatusBadge({ s }: { s: IngestRow["status"] }) {
  const map: Record<string, string> = {
    running: "secondary",
    succeeded: "success",
    failed: "destructive",
  };
  // @ts-ignore
  return <Badge variant={map[s] || "outline"}>{s}</Badge>;
}

export default function OperatorIngestions() {
  const [rows, setRows] = useState<IngestRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await withRetry(async () => {
        const response = await supabase.from("ingestions_v").select("*").order("finished_at", { ascending: false }).limit(100);
        return response;
      });
      if (!result.error && result.data) setRows(result.data as IngestRow[]);
    } catch (error) {
      console.error("Failed to load ingestions:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Operator — Ingestion Logs</h1>
        <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
      </div>

      <Card className="p-4">
        <div className="grid gap-3">
          {rows.map((r) => {
            const pct = r.chunks_total ? Math.round((r.chunks_done / r.chunks_total) * 100) : 0;
            const finished = r.finished_at ? new Date(r.finished_at).toLocaleString() : "—";
            const updatedAgo = r.updated_at ? Math.round((Date.now() - new Date(r.updated_at).getTime()) / 1000) : null;
            const waiting = r.status === "running" && updatedAgo !== null && updatedAgo > 10;

            return (
              <div key={r.id} className="grid items-center gap-3 md:grid-cols-6 border rounded-lg p-3">
                <div className="md:col-span-2">
                  <div className="font-medium">
                    {r.regulation_title} <span className="text-muted-foreground">({r.regulation_short_code})</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Version: {r.version_label ?? "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge s={r.status} />
                  {waiting && <span className="text-xs text-muted-foreground">· backing off…</span>}
                </div>
                <div className="md:col-span-2">
                  <Progress value={pct} className="h-2" />
                  <div className="text-xs mt-1">{r.chunks_done}/{r.chunks_total}</div>
                </div>
                <div className="text-sm">{finished}</div>
              </div>
            );
          })}

          {!rows.length && <div className="text-sm text-muted-foreground">No runs yet.</div>}
        </div>
      </Card>
    </div>
  );
}