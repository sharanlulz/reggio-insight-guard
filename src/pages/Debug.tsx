import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; title: string; short_code: string; org_id: string };

export default function Debug() {
  const [envs, setEnvs] = useState<{ url?: string; anon?: string }>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // Show the envs the app is ACTUALLY using at runtime
    setEnvs({
      url: (import.meta as any).env?.VITE_SUPABASE_URL,
      anon: ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "").slice(0, 8) + "…",
    });

    (async () => {
      // Try both names the app might be using
      const tries = ["public.regulations", "reggio.regulations", "regulations"];
      for (const name of tries) {
        const { data, error } = await supabase
          .from(name)
          .select("id, title, short_code, org_id")
          .limit(10);
        if (error) {
          setError({ tableTried: name, message: error.message, details: (error as any).details });
        } else if (data && data.length) {
          setRows(data as Row[]);
          setError(null);
          break;
        }
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "ui-sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Reggio Debug</h1>
      <div style={{ marginBottom: 16 }}>
        <div><b>VITE_SUPABASE_URL:</b> {envs.url || "(missing)"}</div>
        <div><b>VITE_SUPABASE_ANON_KEY (first 8):</b> {envs.anon || "(missing)"} </div>
      </div>
      {error && (
        <div style={{ padding: 12, background: "#fee2e2", borderRadius: 8, marginBottom: 16 }}>
          <div><b>Last table tried:</b> {error.tableTried}</div>
          <div><b>Error:</b> {error.message}</div>
          {error.details && <div><b>Details:</b> {error.details}</div>}
        </div>
      )}
      <div>
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>First rows found</h2>
        {rows.length === 0 ? (
          <div>No rows returned from any table/view.</div>
        ) : (
          <ul style={{ lineHeight: 1.6 }}>
            {rows.map((r) => (
              <li key={r.id}>
                {r.short_code} — {r.title} (org {r.org_id})
              </li>
            ))}
          </ul>
        )}
      </div>
      <p style={{ marginTop: 16, color: "#6b7280" }}>
        Tip: after committing this file, open <code>/debug</code> in your Lovable preview.
      </p>
    </div>
  );
}
