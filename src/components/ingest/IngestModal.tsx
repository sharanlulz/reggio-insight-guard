import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface IngestModalProps {
  open: boolean;
  onClose: () => void;
}

export default function IngestModal({ open, onClose }: IngestModalProps) {
  const [regulationId, setRegulationId] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleIngest() {
    if (!regulationId || !versionLabel || !file) {
      toast({ title: "Missing info", description: "All fields are required." });
      return;
    }

    try {
      setLoading(true);

      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("regulations") // ensure bucket exists
        .upload(`${regulationId}/${versionLabel}/${file.name}`, file, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Trigger edge function
      const { error: fnError } = await supabase.functions.invoke("reggio-ingest", {
        body: {
          regulation_id: regulationId,
          version_label: versionLabel,
          file_path: uploadData?.path,
        },
      });

      if (fnError) throw fnError;

      toast({ title: "Ingestion started", description: "The document is being processed." });
      onClose();
    } catch (err: any) {
      toast({
        title: "Error starting ingestion",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ingest Regulation Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="regulationId">Regulation ID</Label>
            <Input
              id="regulationId"
              placeholder="e.g., PRA-LIQ-TEST"
              value={regulationId}
              onChange={(e) => setRegulationId(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="versionLabel">Version Label</Label>
            <Input
              id="versionLabel"
              placeholder="e.g., v1-auto"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="file">Document File</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleIngest} disabled={loading}>
            {loading ? "Starting..." : "Start Ingest"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
