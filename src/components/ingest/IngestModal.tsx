import { useEffect, useMemo, useState } from "react";
import { fromPublic } from "@/lib/dbPublic";
import { T } from "@/lib/tables";
import { getFunctionsBaseUrl } from "@/lib/functions";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // optional, but handy if you want to paste chunks later
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";

type Regulation = { id: string; title: string; short_code: string };

export default function IngestModal({
  open,
  onClose,
  presetRegulationId,
}: {
  open: boolean;
  onClose: () => void;
  presetRegulationId?: string; // if provided, locks the dropdown to that regulation
}) {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [regId, setRegId] = useState<string>(presetRegulationId || "");
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [versionLabel, setVersionLabel] = useState<string>(() => {
    const dt = new Date();
    const iso = dt.toISOString().slice(0, 10);
    return `v-auto-${iso}`;
  });

  const [submitting, setSubmitting] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [chunksTotal, setChunksTotal] = useState<number>(0);
  const [chunksDone, setChunksDone] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "running" | "succeeded" | "failed">("idle");
  const [errorText, setErrorText] = useState<string>("");

  const canSubmit = useMemo(() => !!regId && !!versionLabel && (!!sourceUrl), [regId, versionLabel, sourceUrl]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await fromPublic<Regulation>(T.REGULATIONS)
        .select("id, title, short_code")
        .order("title");
      if (!error && data) setRegs(data as Regulation[]);
    })();
  }, [open]);

  // Poll ingestion progress when we have a document id
  useEffect(() => {
    if (!docId || status === "succeeded" || status === "failed") return;
    let timer: number | undefined;

    async function poll() {
      const { data, error } = await fromPublic<any>(T.INGESTIONS)
        .select("*")
        .eq("regulation_document_id", docId)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (!error && data && data.length) {
        const r = data[0];
        setChunksTotal(r.chunks_total || 0);
        setChunksDone(r.chunks_done || 0);
        setStatus(r.status || "running");
        setErrorText(r.error || "");
      }
      timer = window.setTimeout(poll, 2000);
    }

    poll();
    return () => { if (timer) window.clearTimeout(timer); };
  }, [docId, status]);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setDocId(null);
    setStatus("running");
    setErrorText("");
    setChunksDone(0);
    setChunksTotal(0);

    try {
      const fnUrl = `${getFunctionsBaseUrl()}/reggio-ingest`;
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          regulationId: regId,
          source_url: sourceUrl,
          document: { versionLabel },
          // chunks: []  // leave empty to let the function fetch & chunk
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      const json = await res.json();
      setDocId(json.regulation_document_id || null);
      setChunksTotal(json.chunks_total || 0);
      toast({ title: "Ingestion started" });
    } catch (e: any) {
      setStatus("failed");
      setErrorText(e?.message || String(e));
      toast({ variant: "destructive", title: "Ingestion failed", description: errorText.slice(0, 240) });
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndClose() {
    setRegId(presetRegulationId || "");
    setSourceUrl("");
    setVersionLabel(`v-auto-${new Date().toISOString().slice(0,10)}`);
    setSubmitting(false);
    setDocId(null);
    setChunksTotal(0);
    setChunksDone(0);
    setStatus("idle");
    setErrorText("");
    onClose();
  }

  if (!open) return null;

  const pct = chunksTotal ? Math.round((chunksDone / chunksTotal) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={resetAndClose} />

      {/* modal */}
      <div className="absolute inset-0 max-w-xl mx-auto my-12 bg-background rounded-xl shadow-2xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Ingest Regulation Document</h2>
          <Button variant="outline" onClick={resetAndClose}>Close</Button>
        </div>

        <Card className="p-4 space-y-3">
          {!presetRegulationId && (
            <div>
              <label className="block text-sm font-medium mb-1">Regulation</label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={regId}
                onChange={(e) => setRegId(e.target.value)}
              >
                <option value="">Select…</option>
                {regs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.short_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Source URL</label>
            <Input
              placeholder="https://…"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Version label</label>
            <Input
              placeholder="v1-auto"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <Button onClick={submit} disabled={!canSubmit || submitting}>
              {submitting ? "Starting…" : "Start Ingestion"}
            </Button>
          </div>
        </Card>

        {/* Progress */}
        {docId && (
          <Card className="p-4 mt-4">
            <div className="mb-2 text-sm">Progress</div>
            <Progress value={pct} className="h-2" />
            <div className="mt-1 text-xs text-muted-foreground">
              {chunksDone}/{chunksTotal} · {status}
              {status === "running" && <span> · updating…</span>}
              {status === "failed" && errorText && (
                <div className="mt-2 text-destructive">{errorText}</div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
