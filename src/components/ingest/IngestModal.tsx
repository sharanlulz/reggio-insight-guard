// Smart IngestModal with auto-detection capabilities
// REPLACE ENTIRE CONTENTS of: src/components/ingest/IngestModal.tsx

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Link2, Upload, FileText, Zap, Globe, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ---------- Types ----------
interface IngestModalProps {
  open: boolean;
  onClose: () => void;
  presetRegulationId?: string; // optional: lock to a specific reg from Operator page
}

type IngestMode = "url" | "file" | "text";

interface RegulationOption {
  id: string;
  title: string;
  short_code: string;
}

interface AutoDetectedMetadata {
  title?: string;
  version?: string;
  published_at?: string;
  doc_type?: "Regulation" | "Guidance";
  language?: string;
  last_modified?: string;
  hasExisting?: boolean;
  suggestedVersion?: string;
}

// ---------- Quick URLs (handy for operators) ----------
const QUICK_URLs = [
  {
    category: "UK - PRA",
    urls: [
      {
        name: "PRA Rulebook - Liquidity",
        url: "https://www.bankofengland.co.uk/prudential-regulation/publication/2015/pra-rulebook-crd-firms-liquidity",
        suggested_id: "PRA-LIQ",
        expected_type: "Regulation" as const,
        jurisdiction: "UK",
        regulator: "PRA",
      },
      {
        name: "PRA110 Instructions",
        url: "https://www.bankofengland.co.uk/prudential-regulation/regulatory-reporting/regulatory-reporting-banking-sector/pra110",
        suggested_id: "PRA-PRA110",
        expected_type: "Guidance" as const,
        jurisdiction: "UK",
        regulator: "PRA",
      },
    ],
  },
  {
    category: "UK - FCA",
    urls: [
      {
        name: "FCA Handbook - SYSC (PDF)",
        url: "https://www.handbook.fca.org.uk/handbook/SYSC.pdf",
        suggested_id: "FCA-SYSC",
        expected_type: "Regulation" as const,
        jurisdiction: "UK",
        regulator: "FCA",
      },
    ],
  },
  {
    category: "EU - EBA",
    urls: [
      {
        name: "CRR (EUR-Lex)",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32013R0575",
        suggested_id: "EU-CRR",
        expected_type: "Regulation" as const,
        jurisdiction: "EU",
        regulator: "EBA",
      },
    ],
  },
];

// ---------- Helpers (local, no extra imports) ----------
function getFunctionsBaseUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  const m = base?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i);
  const ref = m ? m[1] : "";
  return `https://${ref}.functions.supabase.co`;
}

async function safeFetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      (typeof data?.error === "string" ? data.error : undefined) ||
      text;
    const err: any = new Error(msg || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function todayVersionPrefix() {
  const d = new Date();
  const iso = d.toISOString().slice(0, 10);
  return `v-auto-${iso}`;
}

function chunkText(text: string, max = 2000) {
  const out: { path_hierarchy: string; number_label: string | null; text_raw: string }[] = [];
  let i = 0;
  let n = 0;
  while (i < text.length && out.length < 200) {
    out.push({ path_hierarchy: `Section ${++n}`, number_label: null, text_raw: text.slice(i, i + max) });
    i += max;
  }
  return out;
}

async function detectFromUrl(url: string): Promise<AutoDetectedMetadata> {
  const meta: AutoDetectedMetadata = {};

  // Try HEAD to pick up headers (last-modified, content-language)
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) {
      const lm = head.headers.get("last-modified");
      const lang = head.headers.get("content-language");
      if (lm) meta.last_modified = lm;
      if (lang) meta.language = lang.toUpperCase();
    }
  } catch {
    // ignore
  }

  // Fetch small HTML to extract <title> if text/html
  try {
    const r = await fetch(url, { method: "GET" });
    if (r.ok) {
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("text/html")) {
        const html = await r.text();
        const mTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (mTitle) meta.title = mTitle[1].trim();
      }
    }
  } catch {
    // ignore
  }

  // Guess doc type & language defaults
  meta.doc_type = meta.doc_type || "Regulation";
  meta.language = (meta.language || "EN").toUpperCase();

  // Suggest version based on date
  const d = meta.last_modified ? new Date(meta.last_modified) : new Date();
  if (!Number.isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    meta.suggestedVersion = `v-${yyyy}${mm}${dd}`;
    meta.published_at = d.toISOString();
  } else {
    meta.suggestedVersion = todayVersionPrefix();
  }

  return meta;
}

// ---------- Component ----------
export default function IngestModal({ open, onClose, presetRegulationId }: IngestModalProps) {
  const [mode, setMode] = useState<IngestMode>("url");
  const [regs, setRegs] = useState<RegulationOption[]>([]);
  const [regId, setRegId] = useState<string>(presetRegulationId || "");
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [versionLabel, setVersionLabel] = useState<string>(todayVersionPrefix());
  const [docType, setDocType] = useState<"Regulation" | "Guidance">("Regulation");
  const [language, setLanguage] = useState<string>("EN");
  const [autoMeta, setAutoMeta] = useState<AutoDetectedMetadata>({});
  const [advOpen, setAdvOpen] = useState<boolean>(false);
  const [fileText, setFileText] = useState<string>("");
  const [pasteText, setPasteText] = useState<string>("");

  const canSubmit = useMemo(() => {
    if (!regId || !versionLabel) return false;
    if (mode === "url") return !!sourceUrl;
    if (mode === "file") return !!fileText.trim();
    if (mode === "text") return !!pasteText.trim();
    return false;
  }, [regId, versionLabel, mode, sourceUrl, fileText, pasteText]);

  // Load regulations for dropdown (public view only)
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("regulations_v")
        .select("id, title, short_code")
        .order("title");

      if (!error && data) setRegs(data as RegulationOption[]);
    })();
  }, [open]);

  // If presetRegulationId was passed, lock the dropdown
  useEffect(() => {
    if (presetRegulationId) setRegId(presetRegulationId);
  }, [presetRegulationId]);

  // Check for existing document (reg_id + versionLabel)
  async function checkExisting(regulationId: string, vlabel: string) {
    if (!regulationId || !vlabel) {
      setAutoMeta((m) => ({ ...m, hasExisting: false }));
      return;
    }
    const { data, error } = await supabase
      .from("regulation_documents_v")
      .select("document_id")
      .eq("regulation_id", regulationId)
      .eq("version_label", vlabel)
      .limit(1);
    if (!error && data && data.length > 0) {
      setAutoMeta((m) => ({ ...m, hasExisting: true }));
    } else {
      setAutoMeta((m) => ({ ...m, hasExisting: false }));
    }
  }

  useEffect(() => {
    checkExisting(regId, versionLabel);
  }, [regId, versionLabel]);

  async function handleDetect() {
    if (!sourceUrl) {
      toast({ variant: "destructive", title: "Enter a URL to detect metadata." });
      return;
    }
    try {
      const meta = await detectFromUrl(sourceUrl);
      setAutoMeta(meta);
      if (meta.suggestedVersion && !versionLabel) {
        setVersionLabel(meta.suggestedVersion);
      }
      if (meta.language) setLanguage(meta.language);
      if (meta.doc_type) setDocType(meta.doc_type);
      toast({ title: "Detected", description: meta.title || "Fetched headers/metadata" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Detect failed", description: e?.message || String(e) });
    }
  }

  // File reading (only .txt / .md for v1)
  async function onPickFile(file: File | null) {
    if (!file) return;
    if (!/\.txt$|\.md$/i.test(file.name)) {
      toast({
        variant: "destructive",
        title: "Unsupported file",
        description: "For now, please use .txt or paste text. (PDF/DOCX ingestion via URL is supported.)",
      });
      return;
    }
    const text = await file.text();
    setFileText(text);
    if (!versionLabel) setVersionLabel(todayVersionPrefix());
  }

  async function submit() {
    if (!canSubmit) return;

    const fnUrl = `${getFunctionsBaseUrl()}/reggio-ingest`;
    const baseDoc = {
      versionLabel,
      docType,
      language,
      source_url: mode === "url" ? sourceUrl : undefined,
      published_at: autoMeta.published_at || undefined,
    };

    const payload: any = { regulationId: regId, document: baseDoc };

    if (mode === "url") {
      payload.source_url = sourceUrl;
      // chunks omitted → edge will fetch & chunk
    } else if (mode === "file") {
      payload.chunks = chunkText(fileText);
    } else if (mode === "text") {
      payload.chunks = chunkText(pasteText);
    }

    // Show a friendly note when overwriting an existing version
    if (autoMeta.hasExisting) {
      toast({
        title: "Re-ingesting existing version",
        description: "Old clauses for this document will be replaced.",
      });
    }

    try {
      const res = await safeFetchJson(fnUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      toast({
        title: "Ingestion started",
        description: `Doc ${res.regulation_document_id} • ${res.chunks_total ?? "…" } chunks`,
      });
      // Reset light state, keep dialog open? We'll close to return user to dashboard.
      handleClose();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Ingestion failed",
        description: e?.message || "Unknown error",
      });
      // keep dialog open for fixes
    }
  }

  function handleClose() {
    setSourceUrl("");
    setFileText("");
    setPasteText("");
    setAutoMeta({});
    if (!presetRegulationId) setRegId("");
    setVersionLabel(todayVersionPrefix());
    setDocType("Regulation");
    setLanguage("EN");
    onClose();
  }

  const currentReg = regs.find((r) => r.id === regId);
  const headerBadge = (
    <div className="flex items-center gap-2">
      <Badge variant="outline">
        <Globe className="h-3.5 w-3.5 mr-1" />
        {mode.toUpperCase()}
      </Badge>
      {autoMeta.hasExisting && (
        <Badge variant="secondary">
          <AlertCircle className="h-3.5 w-3.5 mr-1" />
          existing version
        </Badge>
      )}
      {autoMeta.suggestedVersion && (
        <Badge variant="outline">
          <Clock className="h-3.5 w-3.5 mr-1" />
          {autoMeta.suggestedVersion}
        </Badge>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Ingest Regulation Document</DialogTitle>
          {headerBadge}
        </DialogHeader>

        <div className="grid gap-4">
          {/* Regulation select */}
          <div className="grid gap-2">
            <Label>Regulation</Label>
            {presetRegulationId ? (
              <Input
                value={currentReg ? `${currentReg.title} (${currentReg.short_code})` : presetRegulationId}
                readOnly
              />
            ) : (
              <Select value={regId} onValueChange={(v) => setRegId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select regulation…" />
                </SelectTrigger>
                <SelectContent>
                  {regs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title} ({r.short_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Mode tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as IngestMode)} className="w-full">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="url">
                <Link2 className="h-4 w-4 mr-2" />
                URL
              </TabsTrigger>
              <TabsTrigger value="file">
                <Upload className="h-4 w-4 mr-2" />
                File (.txt)
              </TabsTrigger>
              <TabsTrigger value="text">
                <FileText className="h-4 w-4 mr-2" />
                Paste Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="mt-3">
              <Card className="p-4 space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="url">Source URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="url"
                      placeholder="https://…"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                    />
                    <Button variant="secondary" onClick={handleDetect}>
                      <Zap className="h-4 w-4 mr-2" />
                      Detect
                    </Button>
                  </div>
                </div>

                {/* Quick links */}
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Quick sources</Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {QUICK_URLs.map((g) => (
                      <Card key={g.category} className="p-3">
                        <div className="text-xs font-medium mb-2">{g.category}</div>
                        <div className="flex flex-col gap-1">
                          {g.urls.map((u) => (
                            <Button
                              key={u.url}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSourceUrl(u.url);
                                setDocType(u.expected_type);
                              }}
                            >
                              <Globe className="h-3.5 w-3.5 mr-2" />
                              {u.name}
                            </Button>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Detected */}
                {(autoMeta.title || autoMeta.last_modified) && (
                  <div className="text-xs text-muted-foreground">
                    {autoMeta.title && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Title: {autoMeta.title}</span>
                      </div>
                    )}
                    {autoMeta.last_modified && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Last-Modified: {autoMeta.last_modified}</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="file" className="mt-3">
              <Card className="p-4 space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="file">Upload .txt / .md</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".txt,.md"
                    onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Preview (first 400 chars)</Label>
                  <Textarea value={fileText.slice(0, 400)} readOnly />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="text" className="mt-3">
              <Card className="p-4 space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="paste">Paste raw text</Label>
                  <Textarea
                    id="paste"
                    placeholder="Paste text to ingest…"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={10}
                  />
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Document settings */}
          <Card className="p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Version label</Label>
                <Input
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  placeholder="v-auto-YYYY-MM-DD"
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Regulation or Guidance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Regulation">Regulation</SelectItem>
                    <SelectItem value="Guidance">Guidance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Language</Label>
                <Input value={language} onChange={(e) => setLanguage(e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch checked={advOpen} onCheckedChange={setAdvOpen} id="adv" />
              <Label htmlFor="adv">Show advanced metadata</Label>
            </div>

            {advOpen && (
              <div className="grid gap-2 text-xs text-muted-foreground">
                <div>Auto title: {autoMeta.title || "—"}</div>
                <div>Last-Modified: {autoMeta.last_modified || "—"}</div>
                <div>Suggested version: {autoMeta.suggestedVersion || "—"}</div>
                <div>Published at: {autoMeta.published_at || "—"}</div>
              </div>
            )}
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              {autoMeta.hasExisting ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5" />
                  This version already exists. Re-ingest will replace prior clauses for this document.
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ready to ingest.
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={!canSubmit}>
                Start Ingestion
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
