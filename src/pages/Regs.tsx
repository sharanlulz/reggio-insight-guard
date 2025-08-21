import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; title: string; short_code: string; org_id: string };

export default function Regs() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [env, setEnv] = useState<{ url?: string; anon?: string }>({});

  useEffect(() => {
    setEnv({
      url: (import.meta as any).env?.VITE_SUPABASE_URL,
      anon: ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "").slice(0, 8) + "…",
    });

    (async () => {
      // Try public view first to avoid schema issues
      const { data, error } = await supabase
        .from("regulations") // no "public." prefix
        .select("id, title, short_code, jurisdiction, regulator, org_id")
        .order("title");

      if (error) setError(error.message);
      else setRows((data || []) as Row[]);
    })();
  }, []);

  return (
    <div className="p-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold text-foreground mb-4">Regs (direct list)</h1>
      <div className="text-sm text-muted-foreground mb-4">
        Using {env.url || "(no URL)"} — key {env.anon || "(no key)"}
      </div>
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg mb-4">
          Error: {error}
        </div>
      )}
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No rows.</p>
      ) : (
        <div className="bg-card border rounded-lg p-4">
          <ul className="space-y-2">
            {rows.map(r => (
              <li key={r.id} className="text-card-foreground border-b border-border pb-2 last:border-b-0">
                <span className="font-medium text-reggio-primary">{r.short_code}</span> — {r.title} 
                <span className="text-muted-foreground text-sm ml-2">(org {r.org_id})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
