import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

type VersionRow = {
  document_id: string;
  regulation_id: string;
  regulation_title: string;
  short_code: string;
  version_label: string;
  created_at: string;
  deleted: boolean;
};

export default function OperatorVersionsPage() {
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("regulation_documents_v")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Error loading versions", description: error.message });
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(docId: string, mode: "soft" | "hard") {
    setLoading(true);
    try {
      if (mode === "soft") {
        const { error } = await supabase
          .from("regulation_documents")
          .update({ deleted: true })
          .eq("id", docId);
        if (error) throw error;
        toast({ title: "Soft deleted", description: "Document marked as deleted" });
      } else {
        const { error } = await supabase
          .from("regulation_documents")
          .delete()
          .eq("id", docId);
        if (error) throw error;
        toast({ title: "Hard deleted", description: "Document permanently removed" });
      }
      await fetchData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error deleting", description: err.message });
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Operator — Versions</h1>

      {loading && <p>Loading…</p>}

      {!loading && rows.length === 0 && (
        <Card className="p-4">No versions found.</Card>
      )}

      <div className="space-y-3">
        {rows.map((v) => (
          <Card key={v.document_id} className="p-4">
            <div className="flex flex-wrap items-center justify-between">
              <div>
                <div className="font-semibold">{v.regulation_title} ({v.short_code})</div>
                <div className="text-sm text-muted-foreground">
                  Version: {v.version_label} — Created {new Date(v.created_at).toLocaleString()}
                </div>
                {v.deleted && (
                  <div className="text-xs text-red-500 font-semibold">[DELETED]</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfirmDelete(v.document_id);
                    setDeleteMode("soft");
                  }}
                  disabled={v.deleted}
                >
                  Soft Delete
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setConfirmDelete(v.document_id);
                    setDeleteMode("hard");
                  }}
                >
                  Hard Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 space-y-4 max-w-md w-full">
            <h2 className="text-lg font-bold">Confirm {deleteMode} delete</h2>
            <p>
              Are you sure you want to {deleteMode} delete this document?
              {deleteMode === "hard" && " This action cannot be undone."}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                variant={deleteMode === "hard" ? "destructive" : "default"}
                onClick={() => {
                  handleDelete(confirmDelete, deleteMode);
                  setConfirmDelete(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
