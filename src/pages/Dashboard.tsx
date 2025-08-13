import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Regulation = {
  id: string;
  title: string;
  short_code: string;
  jurisdiction: string | null;
  regulator: string | null;
  org_id: string;
};

type DocAgg = { regulation_id: string; count: number; max_created: string | null };
type RiskAgg = { regulation_id: string; risk_area: string | null; count: number };

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
}

const DEMO_ORG_ID = (import.meta as any).env?.VITE_REGGIO_ORG_ID || "d3546758-a241-4546-aff7-fa600731502a";

export default function Dashboard() {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsAgg, setDocsAgg] = useState<Record<string, DocAgg>>({});
  const [riskAgg, setRiskAgg] = useState<Record<string, RiskAgg[]>>({});

  // Ingest modal
  const [openIngest, setOpenIngest] = useState(false);
  const [selectedRegId, setSelectedRegId] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [manualText, setManualText] = useState("");
  const [versionLabel, setVersionLabel] = useState("v1-auto");
  const [docType, setDocType] = useState<"Regulation" | "Guidance">("Regulation");
  const [busy, setBusy] = useState(false);

  // Add Regulation modal
  const [openAdd, setOpenAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newShort, setNewShort] = useState("");
  const [newJur, setNewJur] = useState("UK");
  const [newReg, setNewReg] = useState("PRA");
  const [adding, setAdding] = useState(false);

  // Load regulations
  const loadRegs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("regulations")
      .select("id, title, short_code, jurisdiction, regulator, org_id")
      .order("title");
    if (error) {
      console.error("Error loading regulations", error);
      setRegs([]);
    } else {
      setRegs((data || []) as Regulation[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadRegs(); }, [loadRegs]);

  // Load aggregates when regs change
  const loadAggs = useCallback(async () => {
    if (!regs.length) return;
    const { data: docs } = await supabase
      .from("regulation_documents")
      .select("regulation_id, count:count(), max_created:max(created_at)");
    const mapDocs: Record<string, DocAgg> = {};
    (docs || []).forEach((d: any) => {
      mapDocs[d.regulation_id] = {
        regulation_id: d.regulation_id,
        count: Number(d.count || 0),
        max_created: d.max_created || null,
      };
    });
    setDocsAgg(mapDocs);

    const { data: risks } = await supabase
      .from("clauses")
      .select("regulation_id, risk_area, count:count()");
    const mapRisk: Record<string, RiskAgg[]> = {};
    (risks || []).forEach((r: any) => {
      const rid = r.regulation_id as string;
      if (!mapRisk[rid]) mapRisk[rid] = [];
      mapRisk[rid].push({
        regulation_id: rid,
        risk_area: r.risk_area || "UNKNOWN",
        count: Number(r.count || 0),
      });
    });
    Object.keys(mapRisk).forEach((k) => mapRisk[k].sort((a, b) => b.count - a.count));
    setRiskAgg(mapRisk);
  }, [regs]);

  useEffect(() => { loadAggs(); }, [loadAggs]);

  const handleOpenFor = useCallback((rid: string) => {
    setSelectedRegId(rid);
    setOpenIngest(true);
  }, []);

  const handleIngest = useCallback(async () => {
    if (!selectedRegId) { alert("Please select a regulation."); return; }
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
      const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string;
      const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;
      const fnUrl = supaUrl.replace("supabase.co", "functions.supabase.co") + "/reggio-ingest";

      let chunks: Array<{ path_hierarchy: string; number_label?: string | null; text_raw: string }> | undefined;
      let srcUrlForDoc: string | undefined;
      if (useManual) {
        const clean = manualText.replace(/\s+/g, " ").trim();
        const max = 2000;
        chunks = [];
        let i = 0, idx = 0;
        while (i < clean.length) {
          chunks.push({ path_hierarchy: `Section ${++idx}`, number_label: null, text_raw: clean.slice(i, i + max) });
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
      let pretty = text; try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch {}
      if (!res.ok) { alert(`Ingestion failed (${res.status}):\n${pretty}`); return; }

      alert(`Ingestion succeeded:\n${pretty}`);
      setOpenIngest(false);
      setSourceUrl(""); setManualText(""); setUseManual(false);

      // refresh stats
      await loadAggs();
    } catch (err: any) {
      console.error(err);
      alert("Ingestion error: " + String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }, [selectedRegId, sourceUrl, useManual, manualText, versionLabel, docType, loadAggs]);

  // Add regulation
  const handleAddReg = useCallback(async () => {
    if (!newTitle.trim() || !newShort.trim()) {
      alert("Please enter Title and Short code."); return;
    }
    setAdding(true);
    try {
      const { data, error } = await supabase
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
      setNewTitle(""); setNewShort("");
      await loadRegs();      // refresh list
      await loadAggs();      // refresh stats
      alert("Regulation added.");
    } catch (e: any) {
      alert("Add regulation error: " + String(e?.message || e));
    } finally {
      setAdding(false);
    }
  }, [newTitle, newShort, newJur, newReg, loadRegs, loadAggs]);

  const byId = useMemo(() => Object.fromEntries(regs.map((r) => [r.id, r])), [regs]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={() => setOpenAdd(true)}>+ Add Regulation</Button>
      </div>

      {loading && <p>Loading regulations...</p>}

      {!loading && regs.length === 0 && (
        <p className="text-muted-foreground">No regulations found. Add one to get started.</p>
      )}

      {!loading && regs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {regs.map((r) => {
            const doc = docsAgg[r.id];
            const risks = riskAgg[r.id] || [];
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
                    <span className="text-muted-foreground">Documents</span>
                    <span className="font-medium">{doc?.count ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last ingested</span>
                    <span className="font-medium">{timeAgo(doc?.max_created)}</span>
                  </div>
                  <div className="pt-2">
                    <div className="text-muted-foreground mb-1">Clauses by risk</div>
                    {risks.length === 0 ? (
                      <div className="text-muted-foreground">—</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {risks.slice(0, 6).map((x) => (
                          <span key={`${x.risk_area}-${x.count}`} className="px-2 py-1 rounded-full border text-xs">
                            {x.risk_area}: {x.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button className="mt-4" onClick={() => { setSelectedRegId(r.id); setOpenIngest(true); }}>
                  Ingest Document
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Regulation modal */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a Regulation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Title</label>
              <input className="w-full border rounded-md px-3 py-2 bg-background"
                     value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Short code</label>
              <input className="w-full border rounded-md px-3 py-2 bg-background"
                     placeholder="e.g., PRA-LIQ-TEST"
                     value={newShort} onChange={e => setNewShort(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Jurisdiction</label>
                <input className="w-full border rounded-md px-3 py-2 bg-background"
                       value={newJur} onChange={e => setNewJur(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Regulator</label>
                <input className="w-full border rounded-md px-3 py-2 bg-background"
                       value={newReg} onChange={e => setNewReg(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)} disabled={adding}>Cancel</Button>
            <Button onClick={handleAddReg} disabled={adding}>{adding ? "Adding…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ingest modal */}
      <Dialog open={openIngest} onOpenChange={setOpenIngest}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ingest a regulation document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium">Select regulation</label>
            <select className="w-full border rounded-md px-3 py-2 bg-background"
                    value={selectedRegId} onChange={(e) => setSelectedRegId(e.target.value)}>
              <option value="">-- Choose --</option>
              {regs.map((r) => (
                <option key={r.id} value={r.id}>{r.title} ({r.short_code})</option>
              ))}
            </select>

            <div className="flex items-center gap-2 pt-2">
              <input id="useManual" type="checkbox" checked={useManual} onChange={(e) => setUseManual(e.target.checked)} />
              <label htmlFor="useManual" className="text-sm">Paste text instead of fetching a URL</label>
            </div>

            {!useManual ? (
              <>
                <label className="block text-sm font-medium">Source URL</label>
                <input type="url" placeholder="https://…" className="w-full border rounded-md px-3 py-2 bg-background"
                       value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium">Paste regulation text</label>
                <textarea placeholder="Paste 2–5 paragraphs…" className="w-full border rounded-md px-3 py-2 bg-background min-h-[160px]"
                          value={manualText} onChange={(e) => setManualText(e.target.value)} />
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Version label</label>
                <input className="w-full border rounded-md px-3 py-2 bg-background"
                       value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Doc type</label>
                <select className="w-full border rounded-md px-3 py-2 bg-background"
                        value={docType} onChange={(e) => setDocType(e.target.value as any)}>
                  <option value="Regulation">Regulation</option>
                  <option value="Guidance">Guidance</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenIngest(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleIngest} disabled={busy}>{busy ? "Ingesting…" : "Start ingestion"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
