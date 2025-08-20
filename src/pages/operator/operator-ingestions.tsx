import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withRetry } from "@/lib/supaRetry";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

type IngestionRow = {
  id: string;
  regulation_document_id: string;
  status: "running" | "succeeded" | "failed";
  chunks_total: number | null;
  chunks_done: number | null;
  error: string | null;
  created_at: string;
  updated_at: string | null;
  finished_at: string | null;
};

type DocRow = {
  document_id: string;
  regulation_id: string;
  version_label: string;
};

type RegRow = {
  id: string;
  title: string;
  short_code: string | null;
};

function getFunctionsBaseUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const m = url?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i);
  const ref = m ? m[1] : "";
  return `https://${ref}.functions.supabase.co`;
}

async function safeFetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      (typeof data?.error === "string" ? data.error : text);
    const err: any = new Error(msg || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

function pct(done?: number | null, total?: number | null) {
  const d = Number(done ?? 0);
  const t = Number(total ?? 0);
  if (!t) return 0;
  return Math.min(100, Math.max(0, Math.round((d / t) * 100)));
}

export default function OperatorIngestions() {
  const [rows, setRows] = useState<IngestionRow[]>([]);
  const [docs, setDocs] = useState<Record<string, DocRow>>({});
  const [regs, setRegs] = useState<Record<string, RegRow>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const STALE_MS = 60_000; // 60s without update = stale

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ing, dv, rv] = await Promise.all([
        withRetry(() => supabase.from("ingestions_v").select("*").order("updated_at", { ascending: false })),
        withRetry(() => supabase.from("regulation_documents_v").select("document_id, regulation_id, version_label")),
        withRetry(() => supabase.from("regulations_v").select("id, title, short_code")),
      ]);

      if (ing.error) throw new Error(ing.error.message);
      setRows((ing.data || []) as IngestionRow[]);

      const dmap: Record<string, DocRow> = {};
      (dv.data as DocRow[] | null)?.forEach((d) => (dmap[d.document_id] = d));
      setDocs(dmap);

      const rmap: Record<string, RegRow> = {};
      (rv.data as RegRow[] | null)?.forEach((r) => (rmap[r.id] = r));
      setRegs(rmap);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load failed", description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-poll every 10s while any job is running
  useEffect(() => {
    const anyRunning = rows.some((r) => r.status === "running");
    if (anyRunning && pollRef.current == null) {
      pollRef.current = window.setInterval(() => load(), 10_000) as unknown as number;
    }
    if (!anyRunning && pollRef.current != null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current != null) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [rows, load]);

  async function resume(documentId: string) {
    setWorking(documentId);
    try {
      const fn = `${getFunctionsBaseUrl()}/reggio-resume`;
      await safeFetchJson(fn, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document_id: documentId }),
      });
      toast({ title: "Resume triggered", description: documentId });
      await load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Resume failed", description: e?.message || String(e) });
    } finally {
      setWorking(null);
    }
  }

  async function onRefresh() {
    await load();

    const now = Date.now();
    const stale = rows.filter((r) =>
      r.status === "running" &&
      Number(r.chunks_done ?? 0) < Number(r.chunks_total ?? 0) &&
      r.updated_at &&
      now - new Date(r.updated_at).getTime() > STALE_MS
    );

    for (const r of stale) {
      try {
        const fn = `${getFunctionsBaseUrl()}/reggio-resume`;
        await safeFetchJson(fn, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ document_id: r.regulation_document_id }),
        });
      } catch (e: any) {
        console.error("auto-resume failed", e);
      }
    }

    await load();
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((r) => {
      const d = docs[r.regulation_document_id];
      const g = d ? regs[d.regulation_id] : undefined;
      const title = (g?.title || "").toLowerCase();
      const sc = (g?.short_code || "").toLowerCase();
      const ver = (d?.version_label || "").toLowerCase();
      return (
        r.id.toLowerCase().includes(s) ||
        r.regulation_document_id.toLowerCase().includes(s) ||
        title.includes(s) ||
        sc.includes(s) ||
        ver.includes(s)
      );
    });
  }, [rows, docs, regs, q]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Operator — Ingestion Logs</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search doc id / title / code / version…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="secondary" onClick={onRefresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {filtered.map((row) => {
        const d = docs[row.regulation_document_id];
        const g = d ? regs[d.regulation_id] : undefined;
        const title = g?.title || "Unknown regulation";
        const sc = g?.short_code || "—";
        const ver = d?.version_label || "—";
        const done = Number(row.chunks_done ?? 0);
        const total = Number(row.chunks_total ?? 0);
        const percent = pct(done, total);
        const isRunning = row.status === "running";
        const stale =
          isRunning &&
          row.updated_at &&
          Date.now() - new Date(row.updated_at).getTime() > STALE_MS;

        return (
          <Card key={row.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-semibold">
                  {title} <span className="text-muted-foreground">({sc})</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Version: {ver} · Doc: <code className="text-xs">{row.regulation_document_id}</code>
                </div>
                <div className="text-xs text-muted-foreground">
                  Ingestion: <code>{row.id}</code>
                </div>
              </div>

              <div className="min-w-[220px]">
                <div className="flex items-center justify-between text-sm">
                  <span>Status</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      row.status === "succeeded" ? "default" :
                      row.status === "failed"    ? "destructive" : "secondary"
                    }>
                      {row.status}
                    </Badge>
                    {stale && <Badge variant="outline">stale</Badge>}
                  </div>
                </div>
                <div className="mt-2 h-2 w-full rounded bg-muted overflow-hidden">
                  <div
                    className="h-2 bg-primary"
                    style={{ width: `${percent}%` }}
                    aria-label={`Progress ${percent}%`}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {done} / {total} ({percent}%)
                </div>
              </div>

              <div className="text-right text-sm">
                <div>Updated: {fmtDate(row.updated_at)}</div>
                <div>Started: {fmtDate(row.created_at)}</div>
                <div>Finished: {fmtDate(row.finished_at)}</div>
              </div>
            </div>

            {row.error && (
              <div className="mt-2 text-xs text-red-600 break-words">
                {row.error}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                disabled={working === row.regulation_document_id}
                onClick={() => resume(row.regulation_document_id)}
              >
                {working === row.regulation_document_id ? "Resuming…" : "Resume"}
              </Button>
              <Button variant="outline" onClick={load}>Reload</Button>
            </div>
          </Card>
        );
      })}

      {!loading && filtered.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">
          No ingestions found.
        </Card>
      )}
    </div>
  );
}