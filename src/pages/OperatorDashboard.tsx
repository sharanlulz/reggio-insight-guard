import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withRetry, fetchWithTimeout } from "@/lib/supaRetry";

type Regulation = {
  id: string;
  title: string;
  short_code: string;
  jurisdiction: string | null;
  regulator: string | null;
  org_id: string;
};

type RegDoc = {
  id: string;
  regulation_id: string;
  version_label: string;
  doc_type: string | null;
  language: string | null;
  source_url: string | null;
  published_at: string | null;
  created_at: string;
};

type IngestionRow = {
  id: string;
  regulation_document_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  chunks_total: number | null;
  chunks_done: number | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
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

function StatusChip({ status }: { status: string }) {
  const c =
    status === "succeeded"
      ? "bg-green-100 text-green-700"
      : status === "failed"
      ? "bg-red-100 text-red-700"
      : "bg-blue-100 text-blue-700";
  return <span className={`text-xs px-2 py-0.5 rounded ${c}`}>{status}</span>;
}

function suggestNextVersion(current?: string) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  if (!current) return `v1-${stamp}`;
  const m = current.match(/^v(\d+)([\w-]*)/i);
  if (m) return `v${Number(m[1]) + 1}-${stamp}`;
  return `${current}-${stamp}`;
}

export default function OperatorDashboard() {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [versions, setVersions] = useState<Record<string, RegDoc[]>>({});
  const [logs, setLogs] = useState<IngestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Bulk ingest modal
  const [openBulk, setOpenBulk] = useState(false);
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [useManual, setUseManual] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [versionLabel, setVersionLabel] = useState("v1-auto");
  const [docType, setDocType] = useState<"Regulation" | "Guidance">("Regulation");
  const [busy, setBusy] = useState(false);

  // Per-version action modal
  const [openVersionAction, setOpenVersionAction] = useState(false);
  const [actionMode, setActionMode] = useState<"refresh" | "new">("refresh");
  const [actionRegId, setActionRegId] = useState<string>("");
  const [actionRegTitle, setActionRegTitle] = useState<string>("");
  const [actionCurrentVersion, setActionCurrentVersion] = useState<string>("");
  const [actionNewVersion, setActionNewVersion] = useState<string>("");
  const [actionUseManual, setActionUseManual] = useState(false);
  const [actionSourceUrl, setActionSourceUrl] = useState("");
  const [actionManualText, setActionManualText] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string;
  const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;
  const fnUrl = useMemo(
    () => supaUrl?.replace("supabase.co", "functions.supabase.co") + "/reggio-ingest",
    [supaUrl]
  );

  // Load regulations
  const loadRegs = useCallback(async () => {
    setLoading(true);
    const { data } = await withRetry(() =>
      supabase
        .from("regulations")
        .select("id, title, short_code, jurisdiction, regulator, org_id")
        .eq("org_id", DEMO_ORG_ID)
        .order("title")
    );
    setRegs((data || []) as Regulation[]);
    setLoading(false);
  }, []);

  // Load versions for a regulation
  const loadVersions = useCallback(async (regId: string) => {
    const { data } = await withRetry(() =>
      supabase
        .from("regulation_documents")
        .select(
          "id, regulation_id, version_label, doc_type, language, source_url, published_at, created_at"
        )
        .eq("regulation_id", regId)
        .order("created_at", { ascending: false })
    );
    setVersions((prev) => ({ ...prev, [regId]: (data || []) as RegDoc[] }));
  }, []);

  // Load ingestion logs (latest first)
  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    const { data } = await withRetry(() =>
      supabase
        .from("ingestions")
        .select(
          "id, regulation_document_id, status, chunks_total, chunks_done, error, started_at, finished_at"
        )
        .order("started_at", { ascending: false })
        .limit(200)
    );
    setLogs((data || []) as IngestionRow[]);
    setLoadingLogs(false);
  }, []);

  // Poll logs every 3s
  useEffect(() => {
    (async () => {
      await loadRegs();
      await loadLogs();
    })();
    const t = setInterval(loadLogs, 3000);
    return () => clearInterval(t);
  }, [loadRegs, loadLogs]);

  // Toggle expand → fetch versions if needed
  const toggleExpand = (regId: string) => {
    setExpanded((e) => ({ ...e, [regId]: !e[regId] }));
    if (!versions[regId]) loadVersions(regId);
  };

  // Bulk selection
  const toggleReg = (id: string) => {
    setSelectedRegIds((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
    );
  };
  const isSelected = (id: string) => selectedRegIds.includes(id);

  // Build optional chunks from pasted text
  const chunkManual = (text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    const max = 2000;
    const chunks: Array<{ path_hierarchy: string; number_label: string | null; text_raw: string }> = [];
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
    return chunks;
  };

  // Bulk ingest run
  const runBulk = async () => {
    if (!selectedRegIds.length) {
      alert("Select at least one regulation.");
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

      for (const regId of selectedRegIds) {
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
          try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch {}
          alert(`Ingestion for ${regId} failed (${res.status}):\n${pretty}`);
          continue;
        }
      }

      alert("Bulk ingestion started.");
      setOpenBulk(false);
      setSelectedRegIds([]);
      setSourceUrl("");
      setManualText("");
      setUseManual(false);
      setTimeout(() => {
        loadLogs();
        selectedRegIds.forEach(loadVersions);
      }, 1500);
    } catch (e: any) {
      alert("Bulk ingest error: " + String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  // Per-version actions (refresh/new)
  const [openVersionAction, setOpenVersionAction] = useState(false);
  const [actionMode, setActionMode] = useState<"refresh" | "new">("refresh");
  const [actionRegId, setActionRegId] = useState<string>("");
  const [actionRegTitle, setActionRegTitle] = useState<string>("");
  const [actionCurrentVersion, setActionCurrentVersion] = useState<string>("");
  const [actionNewVersion, setActionNewVersion] = useState<string>("");
  const [actionUseManual, setActionUseManual] = useState(false);
  const [actionSourceUrl, setActionSourceUrl] = useState("");
  const [actionManualText, setActionManualText] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const openAction = (mode: "refresh" | "new", reg: Regulation, doc?: RegDoc) => {
    setActionMode(mode);
    setActionRegId(reg.id);
    setActionRegTitle(`${reg.title} (${reg.short_code})`);
    setActionCurrentVersion(doc?.version_label || "");
    setActionNewVersion(
      mode === "new" ? suggestNextVersion(doc?.version_label) : doc?.version_label || "v1-auto"
    );
    setActionUseManual(false);
    setActionSourceUrl(doc?.source_url || "");
    setActionManualText("");
    setOpenVersionAction(true);
  };

  const runVersionAction = async () => {
    if (!actionRegId) return;
    const vLabel =
      actionMode === "refresh"
        ? actionCurrentVersion || "v1-auto"
        : actionNewVersion.trim() || suggestNextVersion(actionCurrentVersion);

    if (!actionUseManual && (!actionSourceUrl || !/^https?:\/\//i.test(actionSourceUrl))) {
      alert("Enter a valid http(s) Source URL, or switch to Paste text.");
      return;
    }
    if (actionUseManual && actionManualText.trim().length < 30) {
      alert("Paste at least a few sentences of text.");
      return;
    }

    setActionBusy(true);
    try {
      const chunks = actionUseManual ? chunkManual(actionManualText) : undefined;
      const srcUrlForDoc = actionUseManual ? undefined : actionSourceUrl;

      const res = await fetchWithTimeout(
        fnUrl,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            regulationId: actionRegId,
            source_url: srcUrlForDoc,
            document: {
              versionLabel: vLabel,
              docType: "Regulation",
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
        try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch {}
        alert(`Ingestion failed (${res.status}):\n${pretty}`);
      } else {
        alert(
          actionMode === "refresh"
            ? `Re-ingest started for ${actionRegTitle} — ${vLabel}`
            : `New version ingestion started for ${actionRegTitle} — ${vLabel}`
        );
        setOpenVersionAction(false);
        setTimeout(() => {
          loadLogs();
          loadVersions(actionRegId);
        }, 1500);
      }
    } catch (e: any) {
      alert("Action error: " + String(e?.message || e));
    } finally {
      setActionBusy(false);
    }
  };

  // Map document id → regulation title/code (for logs)
  const [docToReg, setDocToReg] = useState<Record<string, { title: string; short: string }>>({});
  useEffect(() => {
    (async () => {
      const docIds = Array.from(new Set(logs.map((l) => l.regulation_document_id))).filter(Boolean);
      if (!docIds.length) return;
      const { data: docs } = await withRetry(() =>
        supabase.from("regulation_documents").select("id, regulation_id").in("id", docIds)
      );
      const regIds = Array.from(new Set((docs || []).map((d: any) => d.regulation_id))).filter(Boolean);
      if (regIds.length) {
        const { data: rds } = await withRetry(() =>
          supabase.from("regulations").select("id, title, short_code").in("id", regIds)
        );
        const regMap: Record<string, { title: string; short: string }> = {};
        (rds || []).forEach((r: any) => {
          regMap[r.id] = { title: r.title, short: r.short_code };
        });
        const m: Record<string, { title: string; short: string }> = {};
        (docs || []).forEach((d: any) => {
          if (regMap[d.regulation_id]) m[d.id] = regMap[d.regulation_id];
        });
        setDocToReg(m);
      }
    })();
  }, [logs]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Operator Dashboard</h1>
        <Button variant="outline" onClick={() => setOpenBulk(true)}>Bulk Ingest</Button>
      </div>

      <Tabs defaultValue="regs">
        <TabsList>
          <TabsTrigger value="regs">Regulations & Versions</TabsTrigger>
          <TabsTrigger value="logs">Ingestion Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="regs" className="space-y-3">
          {loading && <Card className="p-4">Loading regulations…</Card>}

          {!loading && regs.length === 0 && (
            <Card className="p-4 text-sm text-muted-foreground">No regulations in this org.</Card>
          )}

          {!loading && regs.length > 0 && (
            <div className="space-y-3">
              {regs.map((r) => {
                const isOpen = !!expanded[r.id];
                return (
                  <Card key={r.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected(r.id)}
                        onChange={() => toggleReg(r.id)}
                        title="Include in bulk ingest"
                      />
                      <div className="mr-auto">
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.short_code} · {r.jurisdiction} · {r.regulator}
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => toggleExpand(r.id)}>
                        {isOpen ? "Hide Versions" : "Show Versions"}
                      </Button>
                    </div>

                    {isOpen && (
                      <div className="mt-4">
                        {!versions[r.id] && (
                          <div className="text-sm text-muted-foreground">Loading versions…</div>
                        )}
                        {versions[r.id] && versions[r.id]!.length === 0 && (
                          <div className="text-sm text-muted-foreground">No versions yet.</div>
                        )}
                        {versions[r.id] && versions[r.id]!.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="text-left text-muted-foreground">
                                <tr>
                                  <th className="py-2 pr-4">Version</th>
                                  <th className="py-2 pr-4">Doc Type</th>
                                  <th className="py-2 pr-4">Language</th>
                                  <th className="py-2 pr-4">Source URL</th>
                                  <th className="py-2 pr-4">Published</th>
                                  <th className="py-2 pr-4">Created</th>
                                  <th className="py-2 pr-4">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {versions[r.id]!.map((d) => (
                                  <tr key={d.id} className="border-t align-top">
                                    <td className="py-2 pr-4">{d.version_label}</td>
                                    <td className="py-2 pr-4">{d.doc_type || "—"}</td>
                                    <td className="py-2 pr-4">{d.language || "—"}</td>
                                    <td className="py-2 pr-4">
                                      {d.source_url ? (
                                        <a className="underline" href={d.source_url} target="_blank" rel="noreferrer">
                                          link
                                        </a>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                    <td className="py-2 pr-4">
                                      {d.published_at ? new Date(d.published_at).toLocaleString() : "—"}
                                    </td>
                                    <td className="py-2 pr-4">{new Date(d.created_at).toLocaleString()}</td>
                                    <td className="py-2 pr-4">
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => openAction("refresh", r, d)}
                                          title="Clear & repopulate same version"
                                        >
                                          Re-ingest (refresh)
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => openAction("new", r, d)}
                                          title="Create a new version and ingest"
                                        >
                                          Ingest as new
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-3">
          {loadingLogs && <Card className="p-4">Loading logs…</Card>}
          {!loadingLogs && logs.length === 0 && (
            <Card className="p-4 text-sm text-muted-foreground">No ingestions yet.</Card>
          )}
          {!loadingLogs && logs.length > 0 && (
            <Card className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 px-4">Regulation</th>
                    <th className="py-2 px-4">Status</th>
                    <th className="py-2 px-4">Progress</th>
                    <th className="py-2 px-4">Started</th>
                    <th className="py-2 px-4">Finished</th>
                    <th className="py-2 px-4">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => {
                    const total = l.chunks_total || 0;
                    const done = l.chunks_done || 0;
                    const pct =
                      total > 0
                        ? Math.min(100, Math.round((done / total) * 100))
                        : l.status === "succeeded"
                        ? 100
                        : 0;
                    return (
                      <tr key={l.id} className="border-t align-top">
                        <td className="py-2 px-4">{docToReg[l.regulation_document_id]?.title || "—"}</td>
                        <td className="py-2 px-4"><StatusChip status={l.status} /></td>
                        <td className="py-2 px-4">
                          <div className="w-44 h-2 rounded bg-muted overflow-hidden">
                            <div
                              className={`h-2 ${l.status === "failed" ? "bg-red-500" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-xs mt-1">{done}/{total}</div>
                        </td>
                        <td className="py-2 px-4">{timeAgo(l.started_at)}</td>
                        <td className="py-2 px-4">{timeAgo(l.finished_at)}</td>
                        <td className="py-2 px-4">
                          <div className="max-w-[420px] truncate" title={l.error || ""}>
                            {l.error || "—"}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Bulk Ingest Modal */}
      <Dialog open={openBulk} onOpenChange={setOpenBulk}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Ingest</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Selected regulations: {selectedRegIds.length || 0}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input id="useManual" type="checkbox" checked={useManual} onChange={(e) => setUseManual(e.target.checked)} />
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

            <div className="text-xs text-muted-foreground">
              One request per regulation. Edge function has retry/backoff for Groq limits.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBulk(false)} disabled={busy}>Cancel</Button>
            <Button onClick={runBulk} disabled={busy || selectedRegIds.length === 0}>
              {busy ? "Submitting…" : "Run Bulk Ingest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Per-Version Action Modal */}
      <Dialog open={openVersionAction} onOpenChange={setOpenVersionAction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionMode === "refresh" ? "Re-ingest (refresh this version)" : "Ingest as new version"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm">
              <div><b>Regulation:</b> {actionRegTitle || "—"}</div>
              {actionMode === "refresh" ? (
                <div><b>Version:</b> {actionCurrentVersion || "v1-auto"}</div>
              ) : (
                <>
                  <div><b>Current:</b> {actionCurrentVersion || "—"}</div>
                  <div className="mt-2">
                    <label className="block text-sm font-medium">New version label</label>
                    <input
                      className="w-full border rounded-md px-3 py-2 bg-background"
                      value={actionNewVersion}
                      onChange={(e) => setActionNewVersion(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="actionUseManual"
                type="checkbox"
                checked={actionUseManual}
                onChange={(e) => setActionUseManual(e.target.checked)}
              />
              <label htmlFor="actionUseManual" className="text-sm">Paste text instead of fetching a URL</label>
            </div>

            {!actionUseManual ? (
              <>
                <label className="block text-sm font-medium">Source URL</label>
                <input
                  type="url"
                  placeholder="https://…"
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={actionSourceUrl}
                  onChange={(e) => setActionSourceUrl(e.target.value)}
                />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium">Paste regulation text</label>
                <textarea
                  placeholder="Paste 2–5 paragraphs…"
                  className="w-full border rounded-md px-3 py-2 bg-background min-h-[160px]"
                  value={actionManualText}
                  onChange={(e) => setActionManualText(e.target.value)}
                />
              </>
            )}

            <div className="text-xs text-muted-foreground">
              {actionMode === "refresh"
                ? "Refresh re-uses the same version label and replaces clauses/obligations."
                : "New version keeps history and ingests into a fresh version label."}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenVersionAction(false)} disabled={actionBusy}>
              Cancel
            </Button>
            <Button onClick={runVersionAction} disabled={actionBusy}>
              {actionBusy ? "Submitting…" : actionMode === "refresh" ? "Re-ingest (refresh)" : "Ingest as new"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
