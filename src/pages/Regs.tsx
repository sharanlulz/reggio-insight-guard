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
    <div style={{ padding: 24, fontFamily: "ui-sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Regs (direct list)</h1>
      <div style={{ margin: "8px 0", color: "#6b7280" }}>
        Using {env.url || "(no URL)"} — key {env.anon || "(no key)"}
      </div>
      {error && <div style={{ background: "#fee2e2", padding: 12, borderRadius: 8 }}>Error: {error}</div>}
      {rows.length === 0 ? (
        <p>No rows.</p>
      ) : (
        <ul>
          {rows.map(r => (
            <li key={r.id}>{r.short_code} — {r.title} (org {r.org_id})</li>
          ))}
        </ul>
      )}
    </div>
  );
}
