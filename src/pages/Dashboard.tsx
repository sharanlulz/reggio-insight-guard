import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { withRetry, fetchWithTimeout } from "@/lib/supaRetry";

type Regulation = {
  id: string;
  title: string;
  short_code: string;
  jurisdiction: string | null;
  regulator: string | null;
  org_id: string;
};

type RegStats = {
  docs: number;
  clauses: number;
  latestDocAt: string | null;
};

const DEMO_ORG_ID =
  (import.meta as any).env?.VITE_REGGIO_ORG_ID ||
  "d3546758-a241-4546-aff7-fa600731502a";

export default function Dashboard() {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [stats, setStats] = useState<Record<string, RegStats>>({});
  const [loading, setLoading] = useState(true);

  // Ingest modal state
  const [open, setOpen] = useState(false);
  const [regId, setRegId] = useState<string>("");
  const [useManual, setUseManual] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [versionLabel, setVersionLabel] = useState("v1-auto");
  const [docType, setDocType] = useState<"Regulation" | "Guidance">("Regulation");
  const [busy, setBusy] = useState(false);

  const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string;
  const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;
  const fnUrl = useMemo(
    () => supaUrl?.replace("supabase.co", "functions.supabase.co") + "/reggio-ingest",
    [supaUrl]
  );

  // Load regulations for this org
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await withRetry(() =>
        supabase
          .from("regulations")
          .select("id, title, short_code, jurisdiction, regulator, org_id")
          .eq("org_id", DEMO_ORG_ID)
          .order("title")
      );
      const list = (data || []) as Regulation[];
      setRegs(list);
      setLoading(false);

      // kick off stats load
      loadAllStats(list);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAllStats(list: Regulation[]) {
    // per-reg: docs count (head), latest created_at, clauses count (head)
    const result: Record<string, RegStats> = {};
    for (const r of list) {
      // docs count
      const docsHdr = await withRetry(() =>
        supabase
          .from("regulation_documents")
          .select("*", { count: "exact", head: true })
          .eq("regulation_id", r.id)
      );

      // latest doc time
      const latestRes = await withRetry(() =>
        supabase
          .from("regulation_documents")
          .select("created_at")
          .eq("regulation_id", r.id)
          .order("created_at", { ascending: false })
          .limit(1)
      );

      // clauses count
      const clsHdr = await withRetry(() =>
        supabase
          .from("clauses")
          .select("*", { count: "exact", head: true })
          .eq("regulation_id", r.id)
      );

      result[r.id] = {
        docs: Number(docsHdr.count || 0),
        clauses: Number(clsHdr.count || 0),
        latestDocAt: latestRes.data?.[0]?.created_at ?? null,
      };
    }
    setStats(result);
  }

  // Totals bar
  const totals = useMemo(() => {
    let regsCount = regs.length;
    let docsCount = 0;
    let clausesCount = 0;
    Object.values(stats).forEach((s) => {
      docsCount += s.docs;
      clausesCount += s.clauses;
    });
    // last ingested = max latestDocAt
    let latest: string | null = null;
    Object.values(stats).forEach((s) => {
      if (s.latestDocAt && (!latest || new Date(s.latestDocAt) > new Date(latest))) {
        latest = s.latestDocAt;
      }
    });
    return { regsCount, docsCount, clausesCount, latest };
  }, [regs, stats]);

  // Ingest helpers
  function chunkManual(text: string) {
    const clean = text.replace(/\s+/g, " ").trim();
    const max = 2000;
    const out: Array<{ path_hierarchy: string; number_label: string | null; text_raw: string }> =
      [];
    let i = 0,
      idx = 0;
    while (i < clean.length) {
      out.push({
        path_hierarchy: `Section ${++idx}`,
        number_label: null,
        text_raw: clean.slice(i, i + max),
      });
      i += max;
    }
    return out;
  }

  async function runIngest() {
    if (!regId) {
      alert("Choose a regulation.");
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
      const chunks = useManual ? chunkManual(manualText) : undefined;
      const srcUrlForDoc = useManual ? undefined : sourceUrl;

      const res = await fetchWithTimeout(
        fnUrl,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            regulationId: regId,
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
        },
        15000
      );

      const text = await res.text();
      if (!res.ok) {
        let pretty = text;
        try {
          pretty = JSON.stringify(JSON.parse(text), null, 2);
        } catch {}
        alert(`Ingestion failed (${res.status}):\n${pretty}`);
      } else {
        alert("Ingestion started.");
        setOpen(false);
        // refresh stats soon after
        setTimeout(() => loadAllStats(regs), 1500);
      }
    } catch (e: any) {
      alert("Ingest error: " + String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => { setOpen(true); setRegId(regs[0]?.id || ""); }}>
          Ingest
        </Button>
      </div>

      {/* Totals bar */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Documents ingested</div>
          <div className="text-2xl font-semibold">{totals.docsCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Clauses (total)</div>
          <div className="text-2xl font-semibold">{totals.clausesCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Last ingested</div>
          <div className="text-lg">
            {totals.latest ? new Date(totals.latest).toLocaleString() : "—"}
          </div>
        </Card>
      </div>

      {/* Regulations list */}
      {loading && <Card className="p-4">Loading…</Card>}

      {!loading && regs.length === 0 && (
        <Card className="p-4 text-sm text-muted-foreground">
          No regulations yet. Create one, then ingest a document.
        </Card>
      )}

      {!loading && regs.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {regs.map((r) => {
            const s = stats[r.id] || { docs: 0, clauses: 0, latestDocAt: null };
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.short_code} · {r.jurisdiction} · {r.regulator}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRegId(r.id);
                      setVersionLabel("v1-auto");
                      setSourceUrl("");
                      setManualText("");
                      setUseManual(false);
                      setOpen(true);
                    }}
                  >
                    Ingest
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Versions</div>
                    <div className="text-xl font-semibold">{s.docs}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Clauses</div>
                    <div className="text-xl font-semibold">{s.clauses}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Latest</div>
                    <div className="text-sm">
                      {s.latestDocAt ? new Date(s.latestDocAt).toLocaleString() : "—"}
                    </div>
                  </Card>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Ingest Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ingest Regulation</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Regulation</label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={regId}
                onChange={(e) => setRegId(e.target.value)}
              >
                <option value="">-- Choose --</option>
                {regs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.short_code})
                  </option>
                ))}
              </select>
            </div>

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

            <div className="flex items-center gap-2 pt-1">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={runIngest} disabled={busy || !regId}>
              {busy ? "Submitting…" : "Start Ingestion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
