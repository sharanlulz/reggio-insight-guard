import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/use-seo";
import { FileText, Upload } from "lucide-react";

interface Regulation { id: string; title: string; short_code: string; jurisdiction: string | null; regulator: string | null; }

const Dashboard = () => {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [regId, setRegId] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [version, setVersion] = useState("v1");

  useSEO({ title: "Dashboard – Reggio", description: "Manage and ingest regulations in Reggio." });

  useEffect(() => {
    
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/auth";
        return;
      }
      const { data, error } = await (supabase as any)
        .from("reggio.regulations")
        .select("id,title,short_code,jurisdiction,regulator")
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        toast({ title: "Failed to load regulations", description: error.message });
      } else {
        setRegs(data || []);
        if (data && data.length) setRegId(data[0].id);
      }
      setLoading(false);
    })();
  }, []);

  const handleIngest = async () => {
    if (!regId || !sourceUrl) {
      toast({ title: "Missing fields", description: "Select regulation and provide a URL." });
      return;
    }
    setOpen(false);
    toast({ title: "Ingestion started", description: "We are parsing the document…" });
    const { data, error } = await supabase.functions.invoke("reggio-ingest", {
      body: {
        regulationId: regId,
        source_url: sourceUrl,
        document: { versionLabel: version, docType: "Regulation", language: "en", source_url: sourceUrl },
      },
    });
    if (error) {
      console.error(error);
      toast({ title: "Ingestion failed", description: error.message });
    } else {
      toast({ title: "Ingestion complete", description: `Clauses: ${data?.clauses ?? 0}, Obligations: ${data?.obligations ?? 0}` });
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Regulations</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" /> Ingest Regulation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ingest a regulation document</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Select value={regId} onValueChange={setRegId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select regulation" />
                  </SelectTrigger>
                  <SelectContent>
                    {regs.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Source URL (https://…)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                <Input placeholder="Version label (optional)" value={version} onChange={(e) => setVersion(e.target.value)} />
                <Button onClick={handleIngest} className="w-full">Start Ingestion</Button>
              </div>
            </DialogContent>
          </Dialog>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {loading && <p className="text-muted-foreground">Loading…</p>}
          {!loading && regs.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>No regulations yet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Use the Ingest button to add your first document.</p>
              </CardContent>
            </Card>
          )}
          {regs.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{r.title}</span>
                  <Link className="text-sm text-primary underline" to={`/clauses?reg=${r.id}`}>Browse clauses</Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4"/> {r.short_code} · {r.jurisdiction ?? ""} {r.regulator ? `· ${r.regulator}` : ""}</div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
};

export default Dashboard;
