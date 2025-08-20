// src/pages/StressTestDashboard.tsx
// Stress Testing Dashboard wired to useFinancialData (robust & preview-safe)

import { useMemo } from "react";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useFinancialData } from "@/hooks/useFinancialData";

// --- helpers ---------------------------------------------------------------
function pct(dec?: number, digits = 1) {
  if (dec === undefined || dec === null || !isFinite(dec)) return "—";
  return `${(dec * 100).toFixed(digits)}%`;
}
function money(n?: number, digits = 1) {
  if (n === undefined || n === null || !isFinite(n)) return "—";
  return `£${(n / 1_000_000).toFixed(digits)}M`;
}
function clamp01(n: number) {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export default function StressTestDashboard() {
  const {
    loading,
    keyMetrics,
    lcrData,
    capitalData,
    stressResults = [],
    regulatoryAlerts = [],
    strategicRecommendations = [],
    lastUpdated,
    refresh,
  } = useFinancialData();

  // Derived, with full guards so preview never crashes
  const derived = useMemo(() => {
    const total = Number(keyMetrics?.stress?.total_scenarios ?? 0);
    const failed = Number(keyMetrics?.stress?.failed_scenarios ?? 0);
    const passed = Math.max(total - failed, 0);

    const worstLcrDec = Number(keyMetrics?.stress?.worst_lcr ?? 0); // decimal
    const worstLcrPct = Math.round(worstLcrDec * 100); // % number

    const lcrDec = Number(lcrData?.lcr_ratio ?? 0);
    const lcrReqDec = Number(lcrData?.requirement ?? keyMetrics?.lcr?.ratio ?? 1.05);
    const lcrBar = clamp01(lcrDec); // for progress (0..1)

    const tier1 = Number(capitalData?.tier1_capital_ratio ?? 0);
    const rwa = Number(capitalData?.risk_weighted_assets ?? 0);
    const minTier1 = 0.06;
    const shortfall = Math.max(minTier1 * rwa - tier1 * rwa, 0);

    return { total, failed, passed, worstLcrPct, lcrBar, shortfall, minTier1 };
  }, [keyMetrics, lcrData, capitalData]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
          Stress Testing Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <Button onClick={refresh} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {loading ? "Running…" : "Refresh Tests"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : ""}
          </span>
        </div>
      </div>

      {/* Top alerts */}
      {!loading && derived.total > 0 && derived.failed > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some scenarios fail regulatory thresholds. Review recommendations and adjust buffers or asset mix.
          </AlertDescription>
        </Alert>
      )}
      {!loading && derived.total > 0 && derived.failed === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>All scenarios pass current thresholds.</AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Scenarios Tested</div>
          <div className="text-2xl font-semibold">
            {derived.passed}/{derived.total}
          </div>
          <div className="mt-2">
            <Progress value={derived.total ? (derived.passed / derived.total) * 100 : 0} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Worst Case LCR</div>
          <div className="text-2xl font-semibold">{derived.worstLcrPct}%</div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            {derived.worstLcrPct >= 105 ? (
              <>
                <TrendingUp className="h-4 w-4" />
                <span className="text-green-600">Above 105%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4" />
                <span className="text-red-600">Below 105%</span>
              </>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Capital at Risk</div>
          <div className="text-2xl font-semibold">{money(derived.shortfall)}</div>
          <div className="mt-2 text-sm text-muted-foreground">Shortfall vs {pct(derived.minTier1)}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Business Impact</div>
          <div className="text-2xl font-semibold">£0.0M</div>
          <div className="mt-2 text-sm text-muted-foreground">Lending Reduction (placeholder)</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scenarios" className="w-full">
        <TabsList>
          <TabsTrigger value="scenarios">Scenario Results</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="regalerts">Regulatory Alerts</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Scenario Results */}
        <TabsContent value="scenarios" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stressResults.map((r: any, i: number) => {
              const name = r?.scenario_name ?? `Scenario ${i + 1}`;
              const lcr = Number(r?.lcr_result?.lcr_ratio ?? 0);
              const lcrReq = Number(r?.lcr_result?.requirement ?? 1.05);
              const lcrPct = pct(lcr);
              const lcrReqPct = pct(lcrReq);
              const lcrOk =
                (r?.lcr_result?.compliance_status ?? "NON_COMPLIANT") === "COMPLIANT";

              const t1 = Number(r?.capital_result?.tier1_capital_ratio ?? 0);
              const t1Ok = Boolean(r?.capital_result?.compliance_status?.tier1_compliant);
              const t1Pct = pct(t1);

              const sev = r?.overall_assessment?.overall_severity ?? "UNKNOWN";
              const pass = lcrOk && t1Ok;

              return (
                <Card key={i} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{name}</h3>
                    <Badge variant={pass ? "default" : "destructive"}>{pass ? "PASS" : "FAIL"}</Badge>
                  </div>

                  <div className="text-sm">LCR Result</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-medium">{lcrPct}</div>
                    <div className="text-sm text-muted-foreground">Requirement: {lcrReqPct}</div>
                  </div>
                  <Progress value={clamp01(lcr) * 100} />

                  <div className="mt-2 text-sm">Tier 1 Capital</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-medium">{t1Pct}</div>
                    <div className="text-sm text-muted-foreground">Minimum: {pct(0.06)}</div>
                  </div>

                  <div className="mt-2">
                    <span className="text-sm mr-2">Severity</span>
                    <Badge
                      variant={
                        sev === "LOW" ? "default" : sev === "MEDIUM" ? "secondary" : "destructive"
                      }
                    >
                      {sev}
                    </Badge>
                  </div>

                  <div className="mt-2">
                    <div className="text-sm font-medium">Risk Factors:</div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {!t1Ok && <li>Tier 1 capital below minimum</li>}
                      {!lcrOk && <li>LCR below regulatory minimum</li>}
                    </ul>
                  </div>
                </Card>
              );
            })}
            {(!stressResults || stressResults.length === 0) && (
              <Card className="p-6 text-sm text-muted-foreground">
                No scenarios available yet.
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="mt-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Strategic Recommendations</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {strategicRecommendations.map((rec: any, idx: number) => (
                <li key={idx}>
                  <span className="font-medium capitalize">{rec?.priority ?? "info"}:</span>{" "}
                  {rec?.action ?? "—"}{" "}
                  {rec?.rationale ? <em>— {rec.rationale}</em> : null}
                </li>
              ))}
              {strategicRecommendations.length === 0 && (
                <li>No actions required based on current metrics.</li>
              )}
            </ul>
          </Card>
        </TabsContent>

        {/* Regulatory Alerts */}
        <TabsContent value="regalerts" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {regulatoryAlerts.map((a: any, i: number) => (
              <Card key={i} className="p-4 space-y-1">
                <div className="text-sm uppercase text-muted-foreground">{a?.type ?? "info"}</div>
                <div className="font-semibold">{a?.title ?? "Alert"}</div>
                <div className="text-sm text-muted-foreground">{a?.description ?? ""}</div>
                <div className="text-sm mt-1">
                  Impact:{" "}
                  <span className="font-medium">
                    {a?.financial_impact ?? "—"}
                  </span>
                </div>
                <div className="text-sm">Timeline: {a?.timeline_days ?? "—"} days</div>
                <div className="text-sm">Current position: {a?.current_position ?? "—"}</div>
              </Card>
            ))}
            {regulatoryAlerts.length === 0 && (
              <Card className="p-6 text-sm text-muted-foreground">No alerts.</Card>
            )}
          </div>
        </TabsContent>

        {/* Details */}
        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Liquidity (LCR)</h3>
              <div className="text-sm space-y-1">
                <div>Ratio: {pct(lcrData?.lcr_ratio)}</div>
                <div>HQLA: {money(lcrData?.hqla_value)}</div>
                <div>Net Outflows (30d): {money(lcrData?.net_cash_outflows)}</div>
                <div>
                  Buffer/Deficit: {money(lcrData?.buffer_or_deficit)}{" "}
                  <Badge
                    className="ml-2"
                    variant={(lcrData?.buffer_or_deficit ?? 0) >= 0 ? "default" : "destructive"}
                  >
                    {(lcrData?.buffer_or_deficit ?? 0) >= 0 ? "Buffer" : "Deficit"}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Capital</h3>
              <div className="text-sm space-y-1">
                <div>Tier 1: {pct(capitalData?.tier1_capital_ratio)}</div>
                <div>Total Capital: {pct(capitalData?.total_capital_ratio)}</div>
                <div>Leverage: {pct(capitalData?.leverage_ratio)}</div>
                <div>RWA: {money(capitalData?.risk_weighted_assets)}</div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
