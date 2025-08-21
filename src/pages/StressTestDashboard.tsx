// src/pages/StressTestDashboard.tsx
// Matches Dashboard formatting & numbers using useFinancialData

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { useFinancialData } from "@/hooks/useFinancialData";

// ---------- Helpers (mirror Dashboard presentation) ----------
const pct1 = (dec?: number) =>
  dec === undefined || dec === null || !isFinite(dec) ? "—" : `${(dec * 100).toFixed(1)}%`;

const moneyM = (n?: number) =>
  n === undefined || n === null || !isFinite(n) ? "—" : `£${(n / 1_000_000).toFixed(1)}M`;

const clamp0to100 = (n: number) => Math.max(0, Math.min(100, n));

const INTERNAL_T1_TARGET = 0.10; // 10% internal target to show Capital-at-Risk (Dashboard shows proposed 12.0% — tweak if needed)

export default function StressTestDashboard() {
  const {
    loading,
    keyMetrics,
    lcrData,
    capitalData,
    stressResults = [],
    lastUpdated,
    refresh,
  } = useFinancialData();

  // Derived KPI panel (aligned with Dashboard)
  const kpi = useMemo(() => {
    const total = Number(keyMetrics?.stress?.total_scenarios ?? 0);
    const failed = Number(keyMetrics?.stress?.failed_scenarios ?? 0);
    const passed = Math.max(total - failed, 0);

    // Worst-case LCR, decimal
    const worstLCR = Number(keyMetrics?.stress?.worst_lcr ?? 0);

    // Capital at risk vs internal target (so it’s not always £0)
    const rwa = Number(capitalData?.risk_weighted_assets ?? 0);
    const haveT1 = Number(capitalData?.tier1_capital_ratio ?? 0) * rwa;
    const needT1 = INTERNAL_T1_TARGET * rwa;
    const capShortfall = Math.max(needT1 - haveT1, 0);

    return {
      total,
      passed,
      failed,
      worstLCR,
      capShortfall,
    };
  }, [keyMetrics, capitalData]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl md:text-3xl font-bold">Stress Testing Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={refresh} disabled={loading} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            {loading ? "Running…" : "Refresh Tests"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : ""}
          </span>
        </div>
      </div>

      {/* KPI strip — formatted like Dashboard cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Scenarios Tested */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scenarios Tested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {kpi.passed}/{kpi.total}
            </div>
            <div className="mt-2">
              <Progress value={kpi.total ? (kpi.passed / kpi.total) * 100 : 0} />
            </div>
          </CardContent>
        </Card>

        {/* Worst Case LCR */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Worst Case LCR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{pct1(kpi.worstLCR)}</div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              {kpi.worstLCR >= 1.05 ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-reggio-secondary">Above 105%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-destructive">Below 105%</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Capital at Risk (vs internal 10%) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Capital at Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{moneyM(kpi.capShortfall)}</div>
            <div className="mt-2 text-sm text-muted-foreground">Shortfall vs {pct1(INTERNAL_T1_TARGET)}</div>
          </CardContent>
        </Card>

        {/* Current LCR (match Dashboard “current”) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current LCR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{pct1(lcrData?.lcr_ratio)}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Requirement: {pct1(lcrData?.requirement ?? 1.0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scenarios" className="w-full">
        <TabsList>
          <TabsTrigger value="scenarios">Scenario Results</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Scenario Results */}
        <TabsContent value="scenarios" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stressResults.map((r: any, i: number) => {
              const name = r?.scenario_name ?? `Scenario ${i + 1}`;

              // LCR
              const lcr = Number(r?.lcr_result?.lcr_ratio ?? 0);
              const lcrPct = pct1(lcr);
              const lcrReq = Number(r?.lcr_result?.requirement ?? 1.0);
              const lcrReqPct = pct1(lcrReq);
              const lcrPass =
                (r?.lcr_result?.compliance_status ?? "NON_COMPLIANT") === "COMPLIANT";

              // Capital
              const t1 = Number(r?.capital_result?.tier1_capital_ratio ?? 0);
              const t1Pct = pct1(t1);
              const t1Pass = Boolean(r?.capital_result?.compliance_status?.tier1_compliant);

              const pass = lcrPass && t1Pass;
              return (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-2 flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold">{name}</CardTitle>
                    <Badge variant={pass ? "default" : "destructive"}>
                      {pass ? "PASS" : "FAIL"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* LCR */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">LCR</div>
                        <div className="text-xs text-muted-foreground">Req: {lcrReqPct}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-xl font-medium">{lcrPct}</div>
                      {lcr >= 1.05 ? (
                        <Badge variant="outline" className="text-reggio-secondary border-reggio-secondary bg-reggio-secondary/10">Above 105%</Badge>
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive bg-destructive/10">Below 105%</Badge>
                      )}
                      </div>
                      <Progress value={clamp0to100(lcr * 100)} className="mt-2" />
                    </div>

                    {/* Tier 1 */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Tier 1 Capital</div>
                        <div className="text-xs text-muted-foreground">Min: {pct1(0.06)}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-xl font-medium">{t1Pct}</div>
                        <Badge variant={t1Pass ? "outline" : "destructive"}>
                          {t1Pass ? "Compliant" : "Below Min"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {(!stressResults || stressResults.length === 0) && (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No scenarios available.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Details (match Dashboard style) */}
        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Liquidity detail */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Liquidity (LCR)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>Ratio: <span className="font-medium">{pct1(lcrData?.lcr_ratio)}</span></div>
                <div>HQLA: <span className="font-medium">{moneyM(lcrData?.hqla_value)}</span></div>
                <div>Net Outflows (30d): <span className="font-medium">{moneyM(lcrData?.net_cash_outflows)}</span></div>
                <div className="flex items-center gap-2">
                  <span>Buffer/Deficit:</span>
                  <span className="font-medium">{moneyM(lcrData?.buffer_or_deficit)}</span>
                  {Number(lcrData?.buffer_or_deficit ?? 0) < 0 ? (
                    <Badge variant="destructive" className="ml-1">Deficit</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-1">Buffer</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Capital detail */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Capital</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>Tier 1: <span className="font-medium">{pct1(capitalData?.tier1_capital_ratio)}</span></div>
                <div>Total Capital: <span className="font-medium">{pct1(capitalData?.total_capital_ratio)}</span></div>
                <div>Leverage: <span className="font-medium">{pct1(capitalData?.leverage_ratio)}</span></div>
                <div>RWA: <span className="font-medium">{moneyM(capitalData?.risk_weighted_assets)}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Inline guidance when failures occur (Dashboard tone) */}
      {kpi.failed > 0 && (
        <div className="flex items-start gap-3 rounded-md border p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <div className="font-medium">Some scenarios fail regulatory thresholds.</div>
            <div className="text-sm text-muted-foreground">
              Consider increasing Level 1 HQLA or reducing unsecured wholesale dependence to lift stressed LCR above 100%.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
