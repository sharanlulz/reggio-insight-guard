import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface Clause {
  id: string;
  path_hierarchy: string | null;
  summary_plain: string | null;
  text_raw: string;
  obligation_type: string | null;
  risk_area: string | null;
}

const riskAreas = ["LIQUIDITY","CAPITAL","MARKET","CREDIT","OPERATIONAL","CONDUCT","AML_CFT","DATA_PRIVACY","TECH_RISK","OUTSOURCING","IRRBB","RRP"];
const obligationTypes = ["MANDATORY","RECOMMENDED","REPORTING","DISCLOSURE","RESTRICTION","GOVERNANCE","RISK_MANAGEMENT","RECORD_KEEPING"];

const Clauses = () => {
  const params = new URLSearchParams(window.location.search);
  const initialReg = params.get("reg") || "";

  const [regId, setRegId] = useState(initialReg);
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<string>("");
  const [obType, setObType] = useState<string>("");
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [regs, setRegs] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    document.title = "Clauses – Reggio";
    (async () => {
      const { data: regsData } = await (supabase as any).from("reggio.regulations").select("id,title").order("title");
      setRegs(regsData || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!regId) return setClauses([]);
      let query = (supabase as any).from("reggio.clauses").select("id,path_hierarchy,summary_plain,text_raw,obligation_type,risk_area").eq("regulation_id", regId).order("created_at", { ascending: false }).limit(1000);
      if (risk) query = query.eq("risk_area", risk);
      if (obType) query = query.eq("obligation_type", obType);
      if (q) query = query.ilike("text_raw", `%${q}%`);
      const { data, error } = await query;
      if (!error) setClauses(data || []);
    })();
  }, [regId, q, risk, obType]);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-4">
        <h1 className="text-3xl font-semibold">Clauses Browser</h1>
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={regId} onValueChange={setRegId}>
            <SelectTrigger><SelectValue placeholder="Regulation" /></SelectTrigger>
            <SelectContent>
              {regs.map((r) => (<SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input placeholder="Search text" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger><SelectValue placeholder="Risk area" /></SelectTrigger>
            <SelectContent>
              {riskAreas.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={obType} onValueChange={setObType}>
            <SelectTrigger><SelectValue placeholder="Obligation type" /></SelectTrigger>
            <SelectContent>
              {obligationTypes.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <section className="grid gap-3">
          {clauses.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">{c.path_hierarchy ?? ""}</div>
                <div className="font-medium mb-1">{c.summary_plain ?? c.text_raw.slice(0, 200) + (c.text_raw.length > 200 ? "…" : "")}</div>
                <div className="text-xs text-muted-foreground">{[c.risk_area, c.obligation_type].filter(Boolean).join(" · ")}</div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
};

export default Clauses;
