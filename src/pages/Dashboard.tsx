import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Dashboard() {
  const [regs, setRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Always use the demo org for MVP so any login works
  const DEMO_ORG_ID =
    import.meta.env.VITE_REGGIO_ORG_ID ||
    "d3546758-a241-4546-aff7-fa600731502a";

  useEffect(() => {
    const fetchRegs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("reggio.regulations")
        .select("id, title, short_code, jurisdiction, regulator")
        .eq("org_id", DEMO_ORG_ID)
        .order("title");

      if (error) {
        console.error("Error loading regulations", error);
        setRegs([]);
      } else {
        setRegs(data || []);
      }
      setLoading(false);
    };

    fetchRegs();
  }, [DEMO_ORG_ID]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {loading && <p>Loading regulations...</p>}

      {!loading && regs.length === 0 && (
        <p className="text-muted-foreground">
          No regulations found for demo org.
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
              <Button
                className="mt-4"
                onClick={() => {
                  // Trigger your ingest modal here
                  const evt = new CustomEvent("open-ingest", {
                    detail: { regulationId: r.id },
                  });
                  window.dispatchEvent(evt);
                }}
              >
                Ingest Document
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
