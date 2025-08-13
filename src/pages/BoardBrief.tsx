import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withRetry } from "@/lib/supaRetry";
import { T } from "@/lib/tables";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

type Regulation = { id: string; title: string; short_code: string };
type Clause = {
  id: string;
  risk_area: string | null;
  summary_plain: string | null;
  path_hierarchy: string;
  regulation_title?: string;
  regulation_short_code?: string;
};

const RISK_AREAS = [
  "LIQUIDITY","CAPITAL","MARKET","CREDIT","OPERATIONAL","CONDUCT",
  "AML_CFT","DATA_PRIVACY","TECH_RISK","OUTSOURCING","IRRBB","RRP","RISK_MANAGEMENT",
];

export default function BoardBrief() {
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [regId, setRegId] = useState<string>("");
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [markdown, setMarkdown] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const result = await withRetry(() =>
          supabase.from(T.REGULATIONS).select("id, title, short_code").order("title")
        );
        if (result.error) toast({ variant: "destructive", title: "Load regulations failed", description: result.error.message });
        else setRegs((result.data as Regulation[]) || []);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Load regulations failed", description: error.message });
      }
    })();
  }, []);

  useEffect(() => {
    if (!regId) { setClauses([]); setMarkdown(""); return; }
    (async () => {
      try {
        const result = await withRetry(() =>
          supabase
            .from(T.CLAUSES)
            .select("id, risk_area, summary_plain, path_hierarchy, regulation_title, regulation_short_code")
            .eq("regulation_id", regId)
            .order("path_hierarchy", { ascending: true })
            .limit(2000)
        );
        if (result.error) {
          toast({ variant: "destructive", title: "Load clauses failed", description: result.error.message });
          setClauses([]);
          return;
        }
        setClauses((result.data as Clause[]) || []);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Load clauses failed", description: error.message });
        setClauses([]);
      }
    })();
  }, [regId]);

  useEffect(() => {
    if (!regId || !clauses.length) { setMarkdown(""); return; }
    const byRisk: Record<string, Clause[]> = {};
    for (const ra of RISK_AREAS) byRisk[ra] = [];
    for (const c of clauses) {
      const k = c.risk_area || "Unassigned";
      if (!byRisk[k]) byRisk[k] = [];
      byRisk[k].push(c);
    }

    const regMeta = clauses[0];
    const title = regMeta ? `${regMeta.regulation_title} (${regMeta.regulation_short_code})` : "Selected Regulation";

    const parts: string[] = [];
    parts.push(`# Board Brief — ${title}`);
    parts.push(`_Generated ${new Date().toLocaleString()}_`);
    parts.push("");

    for (const [risk, items] of Object.entries(byRisk)) {
      if (!items.length) continue;
      parts.push(`## ${risk}`);
      items.slice(0, 50).forEach((c) => {
        const s = c.summary_plain || c.path_hierarchy;
        parts.push(`- **${c.path_hierarchy}** — ${s}`);
      });
      parts.push("");
    }

    if (!parts.some(p => p.startsWith("##"))) {
      parts.push("_No tagged clauses yet. Ingest or tag clauses to populate the brief._");
    }

    setMarkdown(parts.join("\n"));
  }, [clauses, regId]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Board Brief</h1>
      <Card className="p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium">Regulation</label>
          <select
            className="w-full border rounded-md px-3 py-2 bg-background"
            value={regId}
            onChange={(e) => setRegId(e.target.value)}
          >
            <option value="">Select regulation…</option>
            {regs.map((r) => (
              <option key={r.id} value={r.id}>{r.title} ({r.short_code})</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">Markdown Preview</div>
        <Textarea rows={18} value={markdown} onChange={(e)=>setMarkdown(e.target.value)} />
        <div className="mt-3">
          <Button
            onClick={() => {
              const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "board-brief.md"; a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download .md
          </Button>
        </div>
      </Card>
    </div>
  );
}