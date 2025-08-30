// src/pages/AnalysisDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Brain } from "lucide-react";

type StatusRow = {
  regulation_id: string;
  regulation_title: string | null;
  regulation_short_code: string | null;
  total_clauses: number;
  analyzed_clauses: number;
  remaining_clauses: number;
  last_analyzed_at: string | null;
};

type RecentClause = {
  id: string;
  regulation_id: string;
  regulation_title: string | null;
  regulation_short_code: string | null;
  path_hierarchy: string | null;
  number_label: string | null;
  text_raw: string;
  summary_plain: string | null;
  obligation_type: string | null;
  risk_area: string | null;
  themes: string[] | null;
  thresholds_count: number | null;
  analyzed_at: string | null;
  created_at: string;
};

export default function AnalysisDashboard() {
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [recent, setRecent] = useState<RecentClause[]>([]);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [batchSize, setBatchSize] = useState(4);
  const [lastMsg, setLastMsg] = useState<string | null>(null);

  const needsWork = useMemo(
    () => rows.filter(r => r.remaining_clauses > 0),
    [rows]
  );

  async function loadStatus() {
    const { data, error } = await supabase
      .from("analysis_status_v")
      .select("*")
      .order("remaining_clauses", { ascending: false });
    if (!error && data) setRows(data as StatusRow[]);
  }

  async function loadRecent() {
    const { data, error } = await supabase
      .from("clauses_recent_v")
      .select("*")
      .order("analyzed_at", { ascending: false })
      .limit(25);
    if (!error && data) setRecent(data as any);
  }

  async function refreshAll() {
    setLoading(true);
    await Promise.all([loadStatus(), loadRecent()]);
    setLoading(false);
  }

  useEffect(() => { refreshAll(); }, []);
  useEffect(() => {
    if (!auto) return;
    const hasRunning = needsWork.length > 0;
    const id = setInterval(refreshAll, hasRunning ? 4000 : 15000);
    return () => clearInterval(id);
  }, [auto, needsWork.length]);

  async function startOne(regulation_id: string) {
    setLastMsg(null);
    const { data, error } = await supabase.functions.invoke("reggio-analyze", {
      body: { regulation_id, batch_size: batchSize }
    });
    if (error) {
      setLastMsg(`Error: ${error.message || String(error)}`);
    } else {
      setLastMsg(`Started batch on ${regulation_id}: processed ${data?.processed ?? 0}, errors ${data?.errors ?? 0}`);
    }
    await refreshAll();
  }

  async function startAll() {
    for (const r of needsWork) {
      await startOne(r.regulation_id);
      await new Promise(res => setTimeout(res, 1500));
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">AI Analysis Control Room</h1>
        <div className="flex items-center gap-2">
          <Button variant={auto ? "default" : "outline"} onClick={() => setAuto(v => !v)}>
            Auto-Refresh: {auto ? "On" : "Off"}
          </Button>
          <Button variant="outline" onClick={refreshAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="font-medium">Batch Size</div>
            <select
              className="border rounded-md px-2 py-1 bg-background"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
            >
              {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="text-sm text-muted-foreground">
            {needsWork.length} regulations need analysis
          </div>
          <Button
            onClick={startAll}
            disabled={needsWork.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            Analyze All Pending
          </Button>
        </div>
        {lastMsg && (
          <div className="text-sm text-muted-foreground mt-3">{lastMsg}</div>
        )}
      </Card>

      {/* Worklist */}
      <Card className="p-4">
        <div className="text-lg font-semibold mb-3">Regulations</div>
        <div className="grid gap-3">
          {rows.map(r => {
            const pct = r.total_clauses > 0
              ? Math.round((r.analyzed_clauses / r.total_clauses) * 100)
              : 0;
            const needs = r.remaining_clauses > 0;

            return (
              <div key={r.regulation_id} className="border rounded-lg p-4">
                <div className="grid items-start gap-3 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <div className="font-medium">
                      {r.regulation_title}{" "}
                      {r.regulation_short_code && (
                        <span className="text-muted-foreground">
                          ({r.regulation_short_code})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last analyzed: {r.last_analyzed_at ? new Date(r.last_analyzed_at).toLocaleString() : "—"}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2">
                    <Badge variant="outline" className={needs ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700"}>
                      {needs ? "pending" : "completed"}
                    </Badge>
                  </div>

                  <div className="md:col-span-3">
                    <Progress value={pct} className="h-2 mb-1" />
                    <div className="text-xs text-muted-foreground">
                      {r.analyzed_clauses}/{r.total_clauses} analyzed · {r.remaining_clauses} remaining
                    </div>
                  </div>

                  <div className="md:col-span-2 text-right">
                    <Button
                      size="sm"
                      variant={needs ? "default" : "outline"}
                      disabled={!needs}
                      onClick={() => startOne(r.regulation_id)}
                    >
                      {needs ? "Analyze batch" : "Up to date"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No data. Run the scraper first, then refresh.
            </div>
          )}
        </div>
      </Card>

      {/* Latest Results */}
      <Card className="p-4">
        <div className="text-lg font-semibold mb-3">Latest analyzed clauses</div>
        <div className="space-y-3">
          {recent.map(rc => (
            <div key={rc.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="font-medium">
                  {rc.regulation_title}{" "}
                  {rc.regulation_short_code && (
                    <span className="text-muted-foreground">({rc.regulation_short_code})</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {rc.analyzed_at ? new Date(rc.analyzed_at).toLocaleString() : new Date(rc.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {rc.path_hierarchy || rc.number_label}
              </div>
              {rc.summary_plain && (
                <div className="mt-2">{rc.summary_plain}</div>
              )}
              <div className="mt-2 text-xs flex gap-2">
                {rc.risk_area && <Badge variant="outline">{rc.risk_area}</Badge>}
                {typeof rc.thresholds_count === "number" && (
                  <Badge variant="outline">{rc.thresholds_count} thresholds</Badge>
                )}
              </div>
            </div>
          ))}

          {recent.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No analysis results yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
