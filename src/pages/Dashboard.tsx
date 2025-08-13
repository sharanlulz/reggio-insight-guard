import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withRetry } from "@/lib/supaRetry";
import { T } from "@/lib/tables";
import { Card } from "@/components/ui/card";

const RISK_AREAS = [
  "LIQUIDITY","CAPITAL","MARKET","CREDIT","OPERATIONAL","CONDUCT",
  "AML_CFT","DATA_PRIVACY","TECH_RISK","OUTSOURCING","IRRBB","RRP","RISK_MANAGEMENT",
];

export default function Dashboard() {
  const [docCount, setDocCount] = useState(0);
  const [lastIngest, setLastIngest] = useState<string>("—");
  const [riskCounts, setRiskCounts] = useState<Record<string, number>>({});

  async function loadCounts() {
    // Documents count via HEAD count
    const docHead = await withRetry(() =>
      supabase.from(T.REGDOCS).select("*", { count: "exact", head: true })
    );
    setDocCount(Number(docHead.count || 0));

    // Last ingestion time
    const ing = await withRetry(() =>
      supabase.from(T.INGESTIONS)
        .select("finished_at, updated_at, status")
        .order("finished_at", { ascending: false })
        .limit(1)
    );
    if (!ing.error && ing.data && ing.data.length) {
      const r = ing.data[0] as any;
      const ts = r.finished_at || r.updated_at;
      setLastIngest(ts ? new Date(ts).toLocaleString() : "—");
    }

    // Risk counts (do multiple head counts to avoid aggregates)
    const counts: Record<string, number> = {};
    await Promise.all(RISK_AREAS.map(async (ra) => {
      const head = await withRetry(() =>
        supabase
          .from(T.CLAUSES)
          .select("*", { count: "exact", head: true })
          .eq("risk_area", ra)
      );
      counts[ra] = Number(head.count || 0);
    }));
    setRiskCounts(counts);
  }

  useEffect(() => { loadCounts(); }, []);

  const topRisks = useMemo(() => {
    const entries = Object.entries(riskCounts).filter(([, n]) => n > 0);
    entries.sort((a,b) => b[1]-a[1]);
    return entries.slice(0, 6);
  }, [riskCounts]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Documents ingested</div>
          <div className="text-3xl font-semibold">{docCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Last ingestion</div>
          <div className="text-xl">{lastIngest}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Top risk areas (by clause count)</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {topRisks.length ? topRisks.map(([k, n]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="truncate">{k}</span>
                <span className="font-medium">{n}</span>
              </div>
            )) : <div className="text-sm text-muted-foreground">No data</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
