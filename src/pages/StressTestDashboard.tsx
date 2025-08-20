// src/pages/StressTestDashboard.tsx
// ✅ Now wired into lib/stress-test-engine.ts for real calculations

import { useState, useEffect } from "react";
import {
  RefreshCw,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Target,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  REGULATORY_SCENARIOS,
  StressTestResult,
  StressScenario,
} from "@/lib/stress-test-engine";

import { StressTestingEngine as ExistingStressEngine } from "@/lib/financial-modeling";

export default function StressTestDashboard() {
  const [stressResults, setStressResults] = useState<StressTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const runStressTests = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("🚀 Running stress test scenarios...");
      const engine = new ExistingStressEngine();

      // Run all predefined scenarios
      const results: StressTestResult[] = REGULATORY_SCENARIOS.map(
        (scenario: StressScenario) => {
          return engine.runStressScenario(scenario);
        }
      );

      setStressResults(results);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("❌ Stress test error:", err);
      setError("Failed to run stress tests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runStressTests();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
          Stress Test Dashboard
        </h1>
        <Button onClick={runStressTests} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {loading ? "Running..." : "Re-run Tests"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && (
        <Tabs defaultValue="scenarios" className="w-full">
          <TabsList>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Scenario Results */}
          <TabsContent value="scenarios">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stressResults.map((result, idx) => (
                <Card key={idx} className="p-4 shadow-md">
                  <h2 className="font-semibold text-lg mb-2">
                    {result.scenario_name}
                  </h2>

                  {/* Liquidity Coverage Ratio */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">LCR Ratio:</span>
                    <Badge
                      variant={
                        result.lcr_result.compliance_status === "COMPLIANT"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {result.lcr_result.lcr_ratio.toFixed(2)}%
                    </Badge>
                  </div>
                  <Progress
                    value={result.lcr_result.lcr_ratio}
                    className="mb-4"
                  />

                  {/* Capital Adequacy */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Tier 1 Ratio:</span>
                    <Badge
                      variant={
                        result.capital_result.compliance_status.tier1_compliant
                          ? "default"
                          : "destructive"
                      }
                    >
                      {result.capital_result.tier1_capital_ratio.toFixed(2)}%
                    </Badge>
                  </div>

                  {/* Overall Assessment */}
                  <div className="mt-3">
                    <span className="font-medium">Overall Severity:</span>{" "}
                    <Badge
                      variant={
                        result.overall_assessment.overall_severity === "LOW"
                          ? "default"
                          : result.overall_assessment.overall_severity ===
                            "MEDIUM"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {result.overall_assessment.overall_severity}
                    </Badge>
                  </div>

                  {/* Recommendations */}
                  {result.recommendations?.length > 0 && (
                    <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
                      {result.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <Card className="p-4">
              <h2 className="font-semibold text-lg mb-3">Portfolio Summary</h2>
              <p className="text-sm text-gray-700">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
              <p className="text-sm mt-2">
                {stressResults.length} stress test scenarios evaluated across
                liquidity, capital adequacy, and funding stability.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
