import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withRetry } from "@/lib/supaRetry";
import { T } from "@/lib/tables";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";

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
        const result = await withRetry(async () => {
          const response = await supabase.from(T.REGULATIONS).select("id, title, short_code").order("title");
          return response;
        });
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
        const result = await withRetry(async () => {
          const response = await supabase
            .from(T.CLAUSES)
            .select("id, risk_area, summary_plain, path_hierarchy, regulation_title, regulation_short_code")
            .eq("regulation_id", regId)
            .order("path_hierarchy", { ascending: true })
            .limit(2000);
          return response;
        });
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
    <div className="min-h-screen bg-background p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-reggio-primary to-reggio-accent flex items-center justify-center">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Board Brief</h1>
      </div>
      
      <Card className="transition-all duration-200 hover:shadow-lg">
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Regulation</label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground focus:ring-2 focus:ring-reggio-primary focus:border-transparent transition-all"
              value={regId}
              onChange={(e) => setRegId(e.target.value)}
            >
              <option value="">Select regulation…</option>
              {regs.map((r) => (
                <option key={r.id} value={r.id}>{r.title} ({r.short_code})</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="transition-all duration-200 hover:shadow-lg">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Markdown Preview</h2>
            <Badge variant="outline" className="text-reggio-primary border-reggio-primary/20">
              {markdown.split('\n').length} lines
            </Badge>
          </div>
          <Textarea 
            rows={18} 
            value={markdown} 
            onChange={(e)=>setMarkdown(e.target.value)}
            className="font-mono text-sm resize-none focus:ring-2 focus:ring-reggio-primary focus:border-transparent transition-all"
            placeholder="Select a regulation to generate the board brief..."
          />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "board-brief.md"; a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={!markdown}
              className="bg-reggio-primary hover:bg-reggio-primary-hover disabled:opacity-50"
            >
              <FileText className="mr-2 h-4 w-4" />
              Download .md
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}