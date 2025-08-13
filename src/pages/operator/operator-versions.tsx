import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withRetry } from "@/lib/supaRetry";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

type VersionRow = {
  document_id: string;
  regulation_id: string;
  regulation_title: string;
  regulation_short_code?: string; // in case your view exposes it later
  short_code: string;             // from regulation_documents_v
  version_label: string;
  created_at: string;
  is_deleted?: boolean;
  deleted?: boolean;              // backward compat with older view
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

function getFunctionsBaseUrl() {
  // Use the project ID directly from the env
  const projectRef = "plktjrbfnzyelwkyyssz";
  return `https://${projectRef}.functions.supabase.co`;
}

export default function OperatorVersions() {
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [coverage, setCoverage] = useState<Record<string, CoverageRow>>({});
  const [q, setQ] = useState("");

  async function load() {
    try {
      const [v1, v2] = await Promise.all([
        withRetry(async () => {
          const response = await supabase.from("regulation_documents_v")
            .select("*")
            .order("created_at", { ascending: false });
          return response;
        }),
        withRetry(async () => {
          const response = await supabase.from("clause_coverage_by_document_v").select("*");
          return response;
        }),
      ]);

      if (v1.error) {
        toast({
          variant: "destructive",
          title: "Load versions failed",
          description: v1.error.message
        });
      } else {
        setRows((v1.data || []) as VersionRow[]);
      }

      if (v2.error) {
        toast({
          variant: "destructive",
          title: "Load coverage failed",
          description: v2.error.message
        });
      } else {
        const map: Record<string, CoverageRow> = {};
        (v2.data as CoverageRow[]).forEach((r) => (map[r.document_id] = r));
        setCoverage(map);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Load failed", description: error.message });
    }
  }

  useEffect(() => { load(); }, []);

  async function softDeleteDoc(docId: string) {
    try {
      const result = await withRetry(async () => {
        const response = await supabase.rpc("soft_delete_document", { p_doc_id: docId });
        return response;
      });
      if (result.error) {
        toast({ variant: "destructive", title: "Delete failed", description: result.error.message });
      } else {
        toast({ title: "Document hidden" });
        load();
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    }
  }

  async function hardDeleteDoc(docId: string) {
    const ok = window.confirm("Hard delete will permanently remove this version and its clauses/obligations. Continue?");
    if (!ok) return;
    try {
      const result = await withRetry(async () => {
        const response = await supabase.rpc("hard_delete_document", { p_doc_id: docId });
        return response;
      });
      if (result.error) {
        toast({ variant: "destructive", title: "Hard delete failed", description: result.error.message });
      } else {
        toast({ title: "Document removed" });
        load();
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Hard delete failed", description: error.message });
    }
  }

  async function reIngest(regId: string, docId: string, versionLabel: string) {
    try {
      // Read the source_url from the public view
      const result = await withRetry(async () => {
        const response = await supabase
          .from("regulation_documents_detail_v")
          .select("source_url")
          .eq("document_id", docId)
          .single();
        return response;
      });
      if (result.error) {
        toast({ variant: "destructive", title: "Load doc failed", description: result.error.message });
        return;
      }
      const doc = result.data;

      let source = (doc?.source_url as string) || "";
      if (!source) {
        source = window.prompt("Enter source URL to ingest:") || "";
        if (!source) return;
      }

      // Call the Edge Function
      const fnUrl = `${getFunctionsBaseUrl()}/reggio-ingest`;
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsa3RqcmJmbnp5ZWx3a3l5c3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDg1ODEsImV4cCI6MjA3MDQyNDU4MX0.od0uTP1PV4iALtJLB79fOCZ5g7ACJew0FzL5CJlzZ20`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          regulationId: regId,
          source_url: source,
          document: { versionLabel }, // function will find/create version safely
          chunks: [],                  // let the function fetch & chunk
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        toast({ variant: "destructive", title: "Re-ingest failed", description: err.slice(0, 240) });
      } else {
        toast({ title: "Re-ingestion started" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Re-ingest failed", description: error.message });
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.regulation_title.toLowerCase().includes(s) ||
        r.short_code.toLowerCase().includes(s) ||
        (r.version_label || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

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

      <div className="space-y-3">
        {filtered.map((v) => {
          const cov = coverage[v.document_id];
          const deleted = v.is_deleted ?? v.deleted ?? false;
          return (
            <Card key={v.document_id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {v.regulation_title} <span className="text-muted-foreground">({v.short_code})</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Version: {v.version_label} · Created {new Date(v.created_at).toLocaleString()}
                  </div>
                  {deleted && <Badge variant="destructive" className="mt-1">DELETED</Badge>}
                </div>

                <div className="text-right text-sm">
                  {cov ? (
                    <>
                      <div>Clauses: <span className="font-medium">{cov.clauses_total}</span></div>
                      <div>
                        Risk: <span className="font-medium">{cov.risk_pct}%</span> ·
                        Obligation: <span className="font-medium"> {cov.obligation_pct}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">Coverage: n/a</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => reIngest(v.regulation_id, v.document_id, v.version_label)}>
                    Re-ingest
                  </Button>
                  <Button variant="outline" onClick={() => softDeleteDoc(v.document_id)} disabled={deleted}>
                    Soft Delete
                  </Button>
                  <Button variant="destructive" onClick={() => hardDeleteDoc(v.document_id)}>
                    Hard Delete
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        {!filtered.length && (
          <Card className="p-6 text-sm text-muted-foreground">
            No versions match your search.
          </Card>
        )}
      </div>
    </div>
  );
}