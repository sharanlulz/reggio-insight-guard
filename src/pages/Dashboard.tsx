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
  const [versionLabel, setVersionLabel] = useState("v1-auto");
  const [docType, setDocType] = useState<"Regulation" | "Guidance">("Regulation");
  const [busy, setBusy] = useState(false);

  // Load regs (no org filter in demo)
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

  // Listen to "open-ingest" event from cards (keeps your previous button behavior working)
  useEffect(() => {
    const handler = (e: any) => {
      const rid = e?.detail?.regulationId as string | undefined;
      if (rid) {
        setSelectedRegId(rid);
      }
      setOpen(true);
    };
    window.addEventListener("open-ingest", handler as any);
    return () => window.removeEventListener("open-ingest", handler as any);
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
    if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
      alert("Please enter a valid http(s) Source URL.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("reggio-ingest", {
        body: {
          regulationId: selectedRegId,
          source_url: sourceUrl,
          document: {
            versionLabel,
            docType,
            language: "en",
            source_url: sourceUrl,
            published_at: new Date().toISOString(),
          },
        },
      });
      if (error) {
        console.error(error);
        alert("Ingestion failed: " + (error.message || "unknown error"));
      } else {
        alert("Ingestion started/completed. Check the Clauses page.");
        setOpen(false);
        setSourceUrl("");
      }
    } catch (err: any) {
      console.error(err);
      alert("Ingestion error: " + String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }, [selectedRegId, sourceUrl, versionLabel, docType]);

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

            <label className="block text-sm font-medium">Source URL</label>
            <input
              type="url"
              placeholder="https://…"
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />

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
