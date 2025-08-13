import { useEffect, useState, useCallback } from "react";
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

export default function Dashboard() {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);

  // Ingest modal state
  const [open, setOpen] = useState(false);
  const [selectedRegId, setSelectedRegId] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [manualText, setManualText] = useState("");
  const [versionLabel, setVersionLabel] = useState("v1-auto");
  const [docType, setDocType] = useState<"Regulation" | "Guidance">("Regulation");
  const [busy, setBusy] = useState(false);

  // Load regs
  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const handleOpenFor = useCallback((rid: string) => {
    setSelectedRegId(rid);
    setOpen(true);
  }, []);

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
      const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string;
      const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;
      if (!supaUrl || !anon) {
        alert("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env.");
        setBusy(false);
        return;
      }
      const fnUrl = supaUrl.replace("supabase.co", "functions.supabase.co") + "/reggio-ingest";

      // If using manual text, build ~2000-char chunks client-side
      let chunks: Array<{ path_hierarchy: string; number_label?: string | null; text_raw: string }> | undefined;
      let srcUrlForDoc: string | undefined = undefined;
      if (useManual) {
        const clean = manualText.replace(/\s+/g, " ").trim();
        const max = 2000;
        chunks = [];
        let i = 0, idx = 0;
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
        headers: {
          "Authorization": `Bearer ${anon}`,
          "Content-Type": "application/json",
        },
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
      if (!res.ok) {
        alert(`Ingestion failed (${res.status}): ${text}`);
        return;
      }
      alert("Ingestion started/completed. Check the Clauses page.");
      setOpen(false);
      setSourceUrl("");
      setManualText("");
      setUseManual(false);
    } catch (err: any) {
      console.error(err);
      alert("Ingestion error: " + String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }, [selectedRegId, sourceUrl, useManual, manualText, versionLabel, docType]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {loading && <p>Loading regulations...</p>}

      {!loading && regs.length === 0 && (
        <p className="text-muted-foreground">
          No regulations found. Seed the database first.
        </p>
      )}

      {!loading && regs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {regs.map((r) => (
            <Card key={r.id} className="p-4 flex flex-col justify-between">
              <div>
                <h2 className="font-semibold">{r.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {r.short_code} · {r.jurisdiction} · {r.regulator}
                </p>
              </div>
              <Button className="mt-4" onClick={() => handleOpenFor(r.id)}>
                Ingest Document
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
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
              <label htmlFor="useManual" className="text-sm">Paste text instead of fetching a URL</label>
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
                  placeholder="Paste 2–5 paragraphs of regulation text here…"
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
                  type="text"
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
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
