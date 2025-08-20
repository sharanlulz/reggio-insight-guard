// src/pages/StressTestDashboard.tsx
// Stress Testing Dashboard wired to useFinancialData (static, realistic demo data)

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

export default function StressTestDashboard() {
  const {
    loading,
    keyMetrics,
    lcrData,
    capitalData,
    stressResults,
    regulatoryAlerts,
    strategicRecommendations,
    lastUpdated,
    refresh,
  } = useFinancialData();

  // Safeguards + derived values
  const totals = useMemo(() => {
    const total = keyMetrics?.stress?.total_scenarios ?? 0;
    const failed = keyMetrics?.stress?.failed_scenarios ?? 0;
    const passed = Math.max(total - failed, 0);
    const worstLcrRatio = keyMetrics?.stress?.worst_lcr ?? 0; // decimal (e.g., 1.23)
    const worstLcrPct = Math.round(worstLcrRatio * 100); // % number (e.g., 123)
    return { total, failed, passed, worstLcrPct };
  }, [keyMetrics]);

  const fmtPct = (decimal?: number) =>
    decimal === undefined || decimal === null
      ? "—"
      : `${(decimal * 100).toFixed(1)}%`;

  const fmtMoney = (num?: number) =>
    num === undefined || num === null
      ? "—"
      : `£${(num / 1_000_000).toFixed(1)}M`;

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
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : ""}
          </span>
        </div>
      </div>

      {/* Top-level alerts */}
      {!loading && (keyMetrics?.stress?.failed_scenarios ?? 0) > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some scenarios fail regulatory thresholds. Review recommendations
            and adjust balance sheet mix or buffers.
          </AlertDescription>
        </Alert>
      )}
      {!loading && (keyMetrics?.stress?.failed_scenarios ?? 0) === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            All scenarios pass current thresholds. Continue monitoring.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Scenarios Tested</div>
          <div className="text-2xl font-semibold">
            {totals.passed}/{totals.total}
          </div>
          <div className="mt-2">
            <Progress
              value={totals.total ? (totals.passed / totals.total) * 100 : 0}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Worst Case LCR</div>
          <div className="text-2xl font-semibold">{totals.worstLcrPct}%</div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            {totals.worstLcrPct >= 105 ? (
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
          <div className="text-2xl font-semibold">
            {/* If your engine returns a capital shortfall, surface here.
               For now, show Tier 1 headroom/shortfall vs 6% */}
            {capitalData
              ? (() => {
                  const minTier1 = 0.06;
                  const rwA = capitalData.risk_weighted_assets ?? 0;
                  const target = minTier1 * rwA;
                  const have = (capitalData.tier1_capital_ratio ?? 0) * rwA;
                  const shortfall = Math.max(target - have, 0);
                  return fmtMoney(shortfall);
                })()
              : "—"}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">Shortfall Risk</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Business Impact</div>
          <div className="text-2xl font-semibold">
            {/* Placeholder for lending reduction / revenue impact model */}
            £0.0M
          </div>
          <div className="mt-2 text-sm text-muted-foreground">Lending Reduction</div>
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
            {(stressResults ?? []).map((r: any, i: number) => {
              const lcr = r?.lcr_result?.lcr_ratio ?? 0; // decimal
              const lcrReq = r?.lcr_result?.requirement ?? 1.05; // decimal
              const lcrPct = (lcr * 100).toFixed(1);
              const lcrReqPct = (lcrReq * 100).toFixed(1);

              const tier1 = r?.capital_result?.tier1_capital_ratio ?? 0; // decimal
              const tier1Min = 0.06;
              const tier1Pct = (tier1 * 100).toFixed(1);

              const lcrCompliant =
                (r?.lcr_result?.compliance_status ?? "NON_COMPLIANT") ===
                "COMPLIANT";
              const tier1Compliant =
                r?.capital_result?.compliance_status?.tier1_compliant ?? false;

              const overallSeverity =
                r?.overall_assessment?.overall_severity ?? "UNKNOWN";

              return (
                <Card key={i} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {r?.scenario_name ?? `Scenario ${i + 1}`}
                    </h3>
                    <Badge variant={lcrCompliant && tier1Compliant ? "default" : "destructive"}>
                      {lcrCompliant && tier1Compliant ? "PASS" : "FAIL"}
                    </Badge>
                  </div>

                  <div className="text-sm">LCR Result</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-medium">{lcrPct}%</div>
                    <div className="text-sm text-muted-foreground">
                      Requirement: {lcrReqPct}%
                    </div>
                  </div>
                  <Progress value={Math.min(lcr * 100, 200)} />

                  <div className="mt-2 text-sm">Tier 1 Capital</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-medium">{tier1Pct}%</div>
                    <div className="text-sm text-muted-foreground">
                      Minimum: {(tier1Min * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="text-sm mr-2">Severity</span>
                    <Badge
                      variant={
                        overallSeverity === "LOW"
                          ? "default"
                          : overallSeverity === "MEDIUM"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {overallSeverity}
                    </Badge>
                  </div>

                  {/* Risk factors */}
                  <div className="mt-2">
                    <div className="text-sm font-medium">Risk Factors:</div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {!tier1Compliant && (
                        <li>Tier 1 capital below 6% minimum</li>
                      )}
                      {!lcrCompliant && <li>LCR below regulatory minimum</li>}
                    </ul>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="mt-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Strategic Recommendations</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {(strategicRecommendations ?? []).map((rec: any, idx: number) => (
                <li key={idx}>
                  <span className="font-medium capitalize">{rec.priority}:</span>{" "}
                  {rec.action} — <span className="italic">{rec.rationale}</span>
                </li>
              ))}
              {(strategicRecommendations ?? []).length === 0 && (
                <li>No actions required based on current metrics.</li>
              )}
            </ul>
          </Card>
        </TabsContent>

        {/* Regulatory Alerts */}
        <TabsContent value="regalerts" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(regulatoryAlerts ?? []).map((a: any, i: number) => (
              <Card key={i} className="p-4 space-y-1">
                <div className="text-sm uppercase text-muted-foreground">
                  {a.type}
                </div>
                <div className="font-semibold">{a.title}</div>
                <div className="text-sm text-muted-foreground">
                  {a.description}
                </div>
                <div className="text-sm mt-1">
                  Impact: <span className="font-medium">{a.financial_impact}</span>
                </div>
                <div className="text-sm">Timeline: {a.timeline_days} days</div>
                <div className="text-sm">
                  Current position: {a.current_position}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Details */}
        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Liquidity (LCR)</h3>
              <div className="text-sm space-y-1">
                <div>Ratio: {fmtPct(lcrData?.lcr_ratio)}</div>
                <div>HQLA: {fmtMoney(lcrData?.hqla_value)}</div>
                <div>Net Outflows (30d): {fmtMoney(lcrData?.net_cash_outflows)}</div>
                <div>
                  Buffer/Deficit: {fmtMoney(lcrData?.buffer_or_deficit)}{" "}
                  <Badge
                    className="ml-2"
                    variant={lcrData?.buffer_or_deficit >= 0 ? "default" : "destructive"}
                  >
                    {lcrData?.buffer_or_deficit >= 0 ? "Buffer" : "Deficit"}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Capital</h3>
              <div className="text-sm space-y-1">
                <div>Tier 1: {fmtPct(capitalData?.tier1_capital_ratio)}</div>
                <div>Total Capital: {fmtPct(capitalData?.total_capital_ratio)}</div>
                <div>Leverage: {fmtPct(capitalData?.leverage_ratio)}</div>
                <div>
                  RWA: {fmtMoney(capitalData?.risk_weighted_assets)}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
