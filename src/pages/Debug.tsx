import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Check = { name: string; ok: boolean; detail?: string };

export default function Debug() {
  const [checks, setChecks] = useState<Check[]>([]);
  const SUPA = (import.meta as any).env?.VITE_SUPABASE_URL as string;
  const ANON = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;

  useEffect(() => {
    (async () => {
      const c: Check[] = [];
      c.push({ name: "Env: VITE_SUPABASE_URL", ok: !!SUPA, detail: SUPA || "missing" });
      c.push({ name: "Env: VITE_SUPABASE_ANON_KEY", ok: !!ANON, detail: ANON?.slice(0, 12) + "…" });

      // DB table counts via public views
      const tables = ["regulations", "regulation_documents", "clauses", "obligations"];
      for (const t of tables) {
        const { data, error } = await supabase.from(t).select("count:count()");
        c.push({ name: `DB: ${t}`, ok: !error, detail: error ? error.message : String((data as any)?.[0]?.count ?? 0) });
      }

      // Ping edge function
      try {
        const fnUrl = SUPA.replace("supabase.co", "functions.supabase.co") + "/reggio-ingest";
        const r = await fetch(fnUrl, { method: "OPTIONS" });
        c.push({ name: "Edge: reggio-ingest OPTIONS", ok: r.ok, detail: `status ${r.status}` });
      } catch (e: any) {
        c.push({ name: "Edge: reggio-ingest OPTIONS", ok: false, detail: String(e?.message || e) });
      }

      setChecks(c);
    })();
  }, []);

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-bold">Reggio Debug</h1>
      <div className="text-sm">Project: {SUPA}</div>
      <ul className="space-y-1">
        {checks.map((k) => (
          <li key={k.name} className={`p-2 rounded border ${k.ok ? "border-green-500" : "border-red-500"}`}>
            <span className="font-medium">{k.name}</span> — {k.ok ? "OK" : "FAIL"} {k.detail ? `· ${k.detail}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
