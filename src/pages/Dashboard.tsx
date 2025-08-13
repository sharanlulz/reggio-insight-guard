import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Regulation = {
  id: string;
  title: string;
  short_code: string;
  jurisdiction: string | null;
  regulator: string | null;
  org_id: string;
};

type IngestionRow = {
  regulation_document_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  chunks_total: number | null;
  chunks_done: number | null;
  error: string | null;
  started_at: string | null;
};

const DEMO_ORG_ID =
  (import.meta as any).env?.VITE_REGGIO_ORG_ID ||
  "d3546758-a241-4546-aff7-fa600731502a";

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
}

export default function Dashboard() {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);

  // Per-reg counts (no aggregates)
  const [docsCount, setDocsCount] = useState<Record<string, number>>({});
  const [docsLast, setDocsLast] = useState<Record<string, string | null>>({});
  const [clausesCount, setClausesCount] = useState<Record<string, number>>({});

  // Progress map per regulation
  const [progress, setProgress] = useState<
    Record<string, { status: string; pct: number; error?: string }>
  >({});
  // Map reg_doc_id -> regulation_id
  const [regDocMap, setRegDocMap] = useState<Record<string, string>>({});

  // Ingest modal
  const [openIngest, setOpenIngest] = useState(false);
  const [selectedRegId, setSelectedRegId] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [manualText, setManualText] = useState("");
  const [versionLabel, setVersionLabel] = useState("v1-auto");
  const [docType, setDocType] = useState<"Regulation" | "Guidance">("Regulation");
  const [busy, setBusy] = useState(false);

  // Add reg modal
  const [openAdd, setOpenAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newShort, setNewShort] = useState("");
  const [newJur, setNewJur] = useState("UK");
  const [newReg, setNewReg] = useState("PRA");
  const [adding, setAdding] = useState(false);

  const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string;
  const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;
  const fnUrl = useMemo(
    () => supaUrl?.replace("supabase.co", "functions.supabase.co") + "/reggio-ingest",
    [supaUrl]
  );

  /** Load all regulations (org-scoped) */
  const loadRegs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("regulations")
      .select("id, title, short_code, jurisdiction, regulator, org_id")
      .eq("org_id", DEMO_ORG_ID)
      .order("title");
    if (error) {
      console.error("Error loading regulations", error);
      setRegs([]);
    } else {
      setRegs((data || []) as Regulation[]);
    }
    setLoading(false);
  }, []);

  /** Per-reg counts WITHOUT aggregates (safer PostgREST config) */
  const loadCounts = useCallback(async (regsList: Regulation[]) => {
    const docsC: Record<string, number> = {};
    const docsL: Record<string, string | null> = {};
    const clsC: Record<string, number> = {};

    for (const r of regsList) {
      // Documents count via count header
      {
        const { count, error } = await supabase
          .from("regulation_documents")
          .select("*", { count: "exact", head: true })
          .eq("regulation_id", r.id);
        if (!error) docsC[r.id] = Number(count || 0);
        else docsC[r.id] = 0;

        // Latest created_at (1-row select)
        const { data: latest } = await supabase
          .from("regulation_documents")
          .select("created_at")
          .eq("regulation_id", r.id)
          .order("created_at", { ascending: false })
          .limit(1);
        docsL[r.id] = latest?.[0]?.created_at ?? null;
      }

      // Clauses count via count header
      {
        const { count, error } = await supabase
          .from("clauses")
          .select("*", { count: "exact", head: true })
          .eq("regulation_id", r.id);
        if (!error) clsC[r.id] = Number(count || 0);
        else clsC[r.id] = 0;
      }
    }

    setDocsCount(docsC);
    setDocsLast(docsL);
    setClausesCount(clsC);
  }, []);

  /** Poll ingestion table and map to regulations */
  useEffect(() => {
    const t = setInterval(async () => {
      const { data: ing } = await supabase
        .from("ingestions")
        .select(
          "regulation_document_id, status, chunks_total, chunks_done, error, started_at"
        )
        .order("started_at", { ascending: false })
        .limit(50);

      const docIds = Array.from(
        new Set((ing || []).map((r) => r.regulation_document_id))
      );
      if (docIds.length) {
        const { data: docs } = await supabase
          .from("regulation_documents")
          .select("id, regulation_id")
          .in("id", docIds);
        const map: Record<string, string> = { ...regDocMap };
        (docs || []).forEach((d: any) => {
          map[d.id] = d.regulation_id;
        });
        setRegDocMap(map);
      }

      const latest: Record<string, { status: string; pct: number; error?: string }> =
        {};
      (ing || []).forEach((row: IngestionRow) => {
        const regId = regDocMap[row.regulation_document_id];
        if (!regId) return;
        if (latest[regId]) return; // already captured latest due to ordering
        const total = row.chunks_total || 0;
        const done = row.chunks_done || 0;
        const pct =
          total > 0
            ? Math.min(100, Math.round((done / total) * 100))
            : row.status === "succeeded"
            ? 100
            : 0;
        latest[regId] = {
          status: row.status,
          pct,
          error: row.status === "failed" ? row.error || "Ingestion failed" : undefined,
        };
      });
      setProgress(latest);
    }, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regDocMap]);

  useEffect(() => {
    (async () => {
      await loadRegs();
    })();
  }, [loadRegs]);

  useEffect(() => {
    if (regs.length) loadCounts(regs);
  }, [regs, loadCounts]);

  const handleAddReg = useCallback(async () => {
    if (!newTitle.trim() || !newShort.trim()) {
      alert("Please enter Title and Short code.");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase
        .from("regulations")
        .insert({
          title: newTitle.trim(),
          short_code: newShort.trim().toUpperCase(),
          jurisdiction: newJur.trim(),
          regulator: newReg.trim(),
          org_id: DEMO_ORG_ID,
        })
        .select("id")
        .single();
      if (error) {
        alert("Add regulation failed: " + (error.message || JSON.stringify(error)));
        return;
      }
      setOpenAdd(false);
      setNewTitle("");
      setNewShort("");
      await loadRegs();
      await loadCounts(regs);
      alert("Regulation added.");
    } catch (e: any) {
      alert("Add regulation error: " + String(e?.message || e));
    } finally {
      setAdding(false);
    }
  }, [newTitle, newShort, newJur, newReg, loadRegs, loadCounts, regs]);

  const handleIngest = useCallback(async () => {
    if (!selectedRegId) {
      alert("Please select a regulation.");
      return;
    }
    if (!useManual && (!sourceUrl || !/^https?:\/\//i.test(sourceUrl))) {
      alert("Enter a valid http(s) Source URL, or switch to Paste text.");
      return;
    }
    if (useManual && manualText.trim().length < 30) {
      alert("Paste at least a few sentences of text.");
      return;
    }

    setBusy(true);
    try {
      let chunks:
        | Array<{ path_hierarchy: string; number_label: string | null; text_raw: string }>
        | undefined;
      let srcUrlForDoc: string | undefined;

      if (useManual) {
        const clean = manualText.replace(/\s+/g, " ").trim();
        const max = 2000;
        chunks = [];
        let i = 0,
          idx = 0;
        while (i < clean.length) {
          chunks.push({
            path_hierarchy: `Section ${++idx}`,
            number_label: null,
            text_raw: clean.slice(i, i + max),
          });
          i += max;
        }
      } else {
        srcUrlForDoc = sourceUrl;
      }

      const res = await fetch(fnUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          regulationId: selectedRegId,
          source_url: srcUrlForDoc,
          document: {
            versionLabel,
            docType,
            language: "en",
            source_url: srcUrlForDoc,
            published_at: new Date().toISOString(),
          },
          ...(chunks ? { chunks } : {}),
        }),
      });

      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
      if (!res.ok) {
        alert(`Ingestion failed (${res.status}):\n${pretty}`);
        return;
      }

      alert(`Ingestion started:\n${pretty}`);
      setOpenIngest(false);
      setSourceUrl("");
      setManualText("");
      setUseManual(false);

      // refresh counts shortly after start; progress will live-update
      setTimeout(() => loadCounts(regs), 1500);
    } catch (err: any) {
      console.error(err);
      alert("Ingestion error: " + String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }, [
    selectedRegId,
    sourceUrl,
    useManual,
    manualText,
    versionLabel,
    docType,
    anon,
    fnUrl,
    regs,
    loadCounts,
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={() => setOpenAdd(true)}>
          + Add Regulation
        </Button>
      </div>

      {loading && <p>Loading regulations...</p>}

      {!loading && regs.length === 0 && (
        <p className="text-muted-foreground">
          No regulations found. Add one to get started.
        </p>
      )}

      {!loading && regs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {regs.map((r) => {
            const docs = docsCount[r.id] ?? 0;
            const last = docsLast[r.id] ?? null;
            const clauses = clausesCount[r.id] ?? 0;
            const prog = progress[r.id];
            const isRunning =
              prog?.status === "running" || prog?.status === "queued";

            return (
              <Card key={r.id} className="p-4 flex flex-col justify-between">
                <div className="space-y-1">
                  <h2 className="font-semibold">{r.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {r.short_code} · {r.jurisdiction} · {r.regulator}
                  </p>
                </div>

                <div className="mt-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Docs</span>
                    <span className="font-medium">{docs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Clauses</span>
                    <span className="font-medium">{clauses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last ingested</span>
                    <span className="font-medium">{timeAgo(last)}</span>
                  </div>

                  {prog && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="uppercase">{prog.status}</span>
                        <span>{prog.pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded bg-muted overflow-hidden">
                        <div
                          className={`h-2 ${
                            prog.status === "failed" ? "bg-red-500" : "bg-primary"
                          }`}
                          style={{ width: `${prog.pct}%` }}
                          title={prog.error || ""}
                        />
                      </div>
                      {prog.error && (
                        <div
                          className="text-xs text-red-500 mt-1 truncate"
                          title={prog.error}
                        >
                          {prog.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  className="mt-4"
                  onClick={() => {
                    setSelectedRegId(r.id);
                    setOpenIngest(true);
                  }}
                  disabled={isRunning}
                >
                  {isRunning ? "Ingesting…" : "Ingest Document"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Regulation modal */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Regulation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Title</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Short code</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                placeholder="e.g., PRA-LIQ-TEST"
                value={newShort}
                onChange={(e) => setNewShort(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Jurisdiction</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={newJur}
                  onChange={(e) => setNewJur(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Regulator</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={newReg}
                  onChange={(e) => setNewReg(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={handleAddReg} disabled={adding}>
              {adding ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ingest modal */}
      <Dialog open={openIngest} onOpenChange={setOpenIngest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ingest a regulation document</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <label className="block text-sm font-medium">Select regulation</label>
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={selectedRegId}
              onChange={(e) => setSelectedRegId(e.target.value)}
            >
              <option value="">-- Choose --</option>
              {regs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.short_code})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="useManual"
                type="checkbox"
                checked={useManual}
                onChange={(e) => setUseManual(e.target.checked)}
              />
              <label htmlFor="useManual" className="text-sm">
                Paste text instead of fetching a URL
              </label>
            </div>

            {!useManual ? (
              <>
                <label className="block text-sm font-medium">Source URL</label>
                <input
                  type="url"
                  placeholder="https://…"
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium">Paste regulation text</label>
                <textarea
                  placeholder="Paste 2–5 paragraphs…"
                  className="w-full border rounded-md px-3 py-2 bg-background min-h-[160px]"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Version label</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Doc type</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                >
                  <option value="Regulation">Regulation</option>
                  <option value="Guidance">Guidance</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenIngest(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleIngest} disabled={busy}>
              {busy ? "Ingesting…" : "Start ingestion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
