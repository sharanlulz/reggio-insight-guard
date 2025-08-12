import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSEO } from "@/hooks/use-seo";

const BoardBrief = () => {
  const printRef = useRef<HTMLPreElement>(null);

  useSEO({ title: "Board Brief – Reggio", description: "Generate a concise compliance update for your board." });

  // For MVP: pull latest 100 clauses regardless of regulation and group by risk_area
  // In future, accept a regulationId filter
  const [clauses, setClauses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("reggio.clauses")
        .select("id,summary_plain,risk_area")
        .order("created_at", { ascending: false })
        .limit(100);
      setClauses(data || []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const c of clauses) {
      const key = c.risk_area || "GENERAL";
      if (!m[key]) m[key] = [];
      m[key].push("- " + (c.summary_plain || "(summary unavailable)"));
    }
    return m;
  }, [clauses]);

  const markdown = useMemo(() => {
    const sections = Object.entries(grouped)
      .map(([area, items]) => [`## ${area}`, ...items, ""].join("\n"))
      .join("\n");
    return `# Board Brief – Compliance Update\n\n${sections}`;
  }, [grouped]);

  const printPDF = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Board Brief</h1>
          <Button onClick={printPDF}>Export PDF</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Markdown Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm" ref={printRef}>{markdown}</pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default BoardBrief;
