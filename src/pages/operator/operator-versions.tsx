import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withRetry } from "@/lib/supaRetry";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

/** ---------- Types from public views ---------- */
type VersionRow = {
  document_id: string;
  regulation_id: string;
  // MAY be missing in your view; we fill via regulations_v if needed:
  regulation_title?: string | null;
  short_code?: string | null;

  version_label: string;
  created_at: string;
  is_deleted?: boolean;
  deleted?: boolean; // backward-compat
};

type CoverageRow = {
  document_id: string;
  version_label: string;
  regulation_id: string;
  regulation_title: string;
  short_code: string;
  clauses_total: number;
  risk_tagged: number;
  obligation_tagged: number;
  risk_pct: number;
  obligation_pct: number;
};

type RegRow = {
  id: string;
  title: string;
  short_code: string | null;
};

/** ---------- Helpers ---------- */
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

function errMsg(e: any) {
  if (e?.payload?.error?.message) return String(e.payload.error.message);
  if (e?.payload?.message) return String(e.payload.message);
  if (e?.error?.message) return String(e.error.message);
  if (typeof e?.error === "string") return e.error;
  if (e?.message) return String(e.message);
  try { return JSON.stringify(e); } catch { return String(e); }
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString(); }
  catch { return iso; }
}

/** ---------- Component ---------- */
export default function OperatorVersions() {
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [coverage, setCoverage] = useState<Record<string, CoverageRow>>({});
  const [regsMap, setRegsMap] = useState<Record<string, RegRow>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null); // disables per-row buttons

  /** Load documents, coverage, and regulations (to fill missing titles/short_codes) */
  async function load() {
    setLoading(true);
    try {
      const [vDocs, vCov, vRegs] = await Promise.all([
        supabase.from("regulation_documents_v")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("clause_coverage_by_document_v").select("*"),
        supabase.from("regulations_v").select("id, title, short_code"),
      ]);

      if (vDocs.error) {
        toast({ variant: "destructive", title: "Load versions failed", description: vDocs.error.message });
      } else {
        setRows((vDocs.data || []) as VersionRow[]);
      }

      if (vCov.error) {
        toast({ variant: "destructive", title: "Load coverage failed", description: vCov.error.message });
      } else {
        const map: Record<string, CoverageRow> = {};
        (vCov.data as CoverageRow[]).forEach((r) => (map[r.document_id] = r));
        setCoverage(map);
      }

      if (vRegs.error) {
        toast({ variant: "destructive", title: "Load regulations failed", description: vRegs.error.message });
      } else {
        const map: Record<string, RegRow> = {};
        (vRegs.data as RegRow[]).forEach((r) => (map[r.id] = r));
        setRegsMap(map);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load failed", description: errMsg(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  /** ---------- Actions ---------- */

  async function reIngest(regId: string, docId: string, versionLabel: string) {
    setWorkingId(docId);
    try {
      // get the source_url from detail view (public)
      const res = await supabase
        .from("regulation_documents_detail_v")
        .select("source_url")
        .eq("document_id", docId)
        .single();
      if (res.error) {
        toast({ variant: "destructive", title: "Load doc failed", description: res.error.message });
        return;
      }
      let source = (res.data?.source_url as string) || "";
      if (!source) {
        source = window.prompt("Enter source URL to ingest:") || "";
        if (!source) return;
      }

      const fnUrl = `${getFunctionsBaseUrl()}/reggio-ingest`;
      const json = await safeFetchJson(fnUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          regulationId: regId,
          source_url: source,
          document: { versionLabel, docType: "Regulation", language: "EN", source_url: source },
          // chunks omitted — function will fetch & chunk
        }),
      });

      toast({ title: "Re-ingestion started", description: `Doc ${json.regulation_document_id}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Re-ingest failed", description: errMsg(e) });
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteDoc(docId: string) {
    setWorkingId(docId);
    try {
      const fn = `${getFunctionsBaseUrl()}/reggio-admin`;
      await safeFetchJson(fn, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "delete_document", id: docId }),
      });
      toast({ title: "Document deleted (soft)" });
      load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: errMsg(e) });
    } finally {
      setWorkingId(null);
    }
  }

  async function restoreDoc(docId: string) {
    setWorkingId(docId);
    try {
      const fn = `${getFunctionsBaseUrl()}/reggio-admin`;
      await safeFetchJson(fn, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "restore_document", id: docId }),
      });
      toast({ title: "Document restored" });
      load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Restore failed", description: errMsg(e) });
    } finally {
      setWorkingId(null);
    }
  }

  /** ---------- Search/filter ---------- */
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((r) => {
      const reg = regsMap[r.regulation_id];
      const title = (r.regulation_title || reg?.title || "").toLowerCase();
      const sc = (r.short_code || reg?.short_code || "").toLowerCase();
      const vl = (r.version_label || "").toLowerCase();
      return title.includes(s) || sc.includes(s) || vl.includes(s);
    });
  }, [rows, regsMap, q]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Operator — Versions</h1>
        <Input
          placeholder="Search regulation, shortcode, version…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading && <Card className="p-3 text-sm text-muted-foreground">Loading…</Card>}

      <div className="space-y-3">
        {filtered.map((v) => {
          const reg = regsMap[v.regulation_id];
          const title = v.regulation_title || reg?.title || "Untitled regulation";
          const sc = v.short_code || reg?.short_code || "—";
          const cov = coverage[v.document_id];
          const deleted = v.is_deleted ?? v.deleted ?? false;
          const busy = workingId === v.document_id;

          return (
            <Card key={v.document_id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Left: titles */}
                <div>
                  <div className="font-semibold">
                    {title}{" "}
                    <span className="text-muted-foreground">({sc})</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Version: {v.version_label} · Created {fmtDate(v.created_at)}
                  </div>
                  {deleted && <Badge variant="destructive" className="mt-1">DELETED</Badge>}
                </div>

                {/* Middle: coverage */}
                <div className="text-right text-sm">
                  {cov ? (
                    <>
                      <div>Clauses: <span className="font-medium">{cov.clauses_total}</span></div>
                      <div>
                        Risk: <span className="font-medium">{cov.risk_pct}%</span> ·{" "}
                        Obligation: <span className="font-medium">{cov.obligation_pct}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">Coverage: n/a</div>
                  )}
                </div>

                {/* Right: actions */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => reIngest(v.regulation_id, v.document_id, v.version_label)}
                  >
                    {busy ? "Working…" : "Re-ingest"}
                  </Button>

                  {!deleted ? (
                    <Button variant="outline" disabled={busy} onClick={() => deleteDoc(v.document_id)}>
                      {busy ? "Working…" : "Delete"}
                    </Button>
                  ) : (
                    <Button variant="outline" disabled={busy} onClick={() => restoreDoc(v.document_id)}>
                      {busy ? "Working…" : "Restore"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {!loading && !filtered.length && (
          <Card className="p-6 text-sm text-muted-foreground">
            No versions match your search.
          </Card>
        )}
      </div>
    </div>
  );
}
