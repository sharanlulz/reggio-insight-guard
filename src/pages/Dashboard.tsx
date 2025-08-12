import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Dashboard() {
  const [regs, setRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegs = async () => {
      setLoading(true);
      // Force-load all regs in DB for MVP — skip org/user filters
      const { data, error } = await supabase
        .from("regulations") // no "public." prefix
        .select("id, title, short_code, jurisdiction, regulator, org_id")
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
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {loading && <p>Loading regulations...</p>}

      {!loading && regs.length === 0 && (
        <p className="text-muted-foreground">
          No regulations found in the database.
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
