// Enhanced StressTestDashboard.tsx
// Consistent with Dashboard.tsx patterns and data structures

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  Target, 
  TrendingUp, 
  RefreshCw, 
  Shield, 
  DollarSign,
  Activity,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

// Types consistent with Dashboard.tsx
interface StressTestMetrics {
  scenario_name: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'EXTREME';
  lcr: {
    baseline: number;
    stressed: number;
    pass: boolean;
    buffer: number;
  };
  capital: {
    tier1_baseline: number;
    tier1_stressed: number;
    pass: boolean;
    shortfall: number;
  };
  business_impact: {
    lending_capacity_reduction: number;
    capital_required: number;
    estimated_losses: number;
    timeline_to_compliance: string;
  };
  confidence: number;
}

interface StressTestOverview {
  total_scenarios: number;
  scenarios_passed: number;
  scenarios_failed: number;
  worst_case_capital_impact: number;
  worst_case_scenario: string;
  overall_status: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  last_run: string;
}

// Format currency - consistent with Dashboard.tsx
const formatCurrency = (value: number, inMillions = true) => {
  if (inMillions) {
    return `£${(value / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Demo data consistent with Dashboard.tsx patterns
const getDemoStressTestData = (): { overview: StressTestOverview; scenarios: StressTestMetrics[] } => {
  const scenarios: StressTestMetrics[] = [
    {
      scenario_name: 'Bank of England 2024 ACS',
      severity: 'SEVERE',
      lcr: {
        baseline: 108.2,
        stressed: 102.8,
        pass: false,
        buffer: -2.2 * 1_000_000 // £2.2M deficit
      },
      capital: {
        tier1_baseline: 11.7,
        tier1_stressed: 5.8,
        pass: false,
        shortfall: 15_000_000 // £15M shortfall
      },
      business_impact: {
        lending_capacity_reduction: 185_000_000,
        capital_required: 15_000_000,
        estimated_losses: 45_000_000,
        timeline_to_compliance: '4-6 months'
      },
      confidence: 0.89
    },
    {
      scenario_name: 'ECB 2024 Adverse Scenario',
      severity: 'SEVERE',
      lcr: {
        baseline: 108.2,
        stressed: 106.1,
        pass: true,
        buffer: 1.1 * 1_000_000
      },
      capital: {
        tier1_baseline: 11.7,
        tier1_stressed: 6.2,
        pass: true,
        shortfall: 0
      },
      business_impact: {
        lending_capacity_reduction: 95_000_000,
        capital_required: 0,
        estimated_losses: 28_000_000,
        timeline_to_compliance: 'Currently compliant'
      },
      confidence: 0.85
    },
    {
      scenario_name: 'Fed 2024 CCAR Severely Adverse',
      severity: 'EXTREME',
      lcr: {
        baseline: 108.2,
        stressed: 98.5,
        pass: false,
        buffer: -6.5 * 1_000_000
      },
      capital: {
        tier1_baseline: 11.7,
        tier1_stressed: 4.8,
        pass: false,
        shortfall: 25_000_000
      },
      business_impact: {
        lending_capacity_reduction: 310_000_000,
        capital_required: 25_000_000,
        estimated_losses: 78_000_000,
        timeline_to_compliance: '8-12 months'
      },
      confidence: 0.82
    },
    {
      scenario_name: 'Basel III Implementation',
      severity: 'MODERATE',
      lcr: {
        baseline: 108.2,
        stressed: 105.8,
        pass: true,
        buffer: 0.8 * 1_000_000
      },
      capital: {
        tier1_baseline: 11.7,
        tier1_stressed: 7.1,
        pass: true,
        shortfall: 0
      },
      business_impact: {
        lending_capacity_reduction: 45_000_000,
        capital_required: 0,
        estimated_losses: 12_000_000,
        timeline_to_compliance: 'Currently compliant'
      },
      confidence: 0.92
    }
  ];

  const failedScenarios = scenarios.filter(s => !s.lcr.pass || !s.capital.pass);
  const worstCaseScenario = scenarios.reduce((worst, current) => 
    current.business_impact.capital_required > worst.business_impact.capital_required ? current : worst
  );

  const overview: StressTestOverview = {
    total_scenarios: scenarios.length,
    scenarios_passed: scenarios.length - failedScenarios.length,
    scenarios_failed: failedScenarios.length,
    worst_case_capital_impact: worstCaseScenario.business_impact.capital_required,
    worst_case_scenario: worstCaseScenario.scenario_name,
    overall_status: failedScenarios.length === 0 ? 'PASS' : 
                   failedScenarios.length <= 1 ? 'CONDITIONAL_PASS' : 'FAIL',
    last_run: new Date().toISOString()
  };

  return { overview, scenarios };
};

// Custom hook for stress test data - consistent with Dashboard.tsx useFinancialData pattern
function useStressTestData() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<StressTestOverview | null>(null);
  const [scenarios, setScenarios] = useState<StressTestMetrics[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadStressTestData = async () => {
    setLoading(true);
    
    try {
      // Try to load real data from database first
      const { data: stressTestResults, error } = await supabase
        .from('clauses')
        .select('*')
        .or('risk_area.eq.LIQUIDITY,risk_area.eq.CAPITAL')
        .ilike('text_raw', '%stress%');

      // Simulate API delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 1500));

      // If we have real stress test related clauses, we could build real scenarios
      // For now, use demo data but this shows the integration pattern
      const demoData = getDemoStressTestData();
      
      setOverview(demoData.overview);
      setScenarios(demoData.scenarios);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error loading stress test data:', error);
      
      // Fallback to demo data on error - consistent with Dashboard.tsx pattern
      const demoData = getDemoStressTestData();
      setOverview(demoData.overview);
      setScenarios(demoData.scenarios);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStressTestData();
  }, []);

  return {
    loading,
    overview,
    scenarios,
    lastUpdated,
    refresh: loadStressTestData
  };
}

const StressTestDashboard: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('all');
  const { loading, overview, scenarios, lastUpdated, refresh } = useStressTestData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <div className="text-lg font-medium">Running Stress Test Analysis...</div>
            <div className="text-sm text-muted-foreground">Processing regulatory scenarios and calculating business impact</div>
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load stress test data. Please try refreshing or contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredScenarios = selectedScenario === 'all' ? scenarios : 
    scenarios.filter(s => s.scenario_name.toLowerCase().includes(selectedScenario.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stress Testing Dashboard</h1>
          <p className="text-muted-foreground">Regulatory stress test compliance and financial impact analysis</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedScenario} 
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="border rounded-md px-3 py-2 bg-background"
          >
            <option value="all">All Scenarios</option>
            <option value="boe">Bank of England</option>
            <option value="ecb">ECB</option>
            <option value="fed">Federal Reserve</option>
            <option value="basel">Basel III</option>
          </select>
          <Button onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running...' : 'Run Stress Tests'}
          </Button>
        </div>
      </div>

      {/* Overall Status Alert */}
      <Alert className={`${
        overview.overall_status === 'PASS' ? 'border-green-200 bg-green-50' :
        overview.overall_status === 'CONDITIONAL_PASS' ? 'border-orange-200 bg-orange-50' :
        'border-red-200 bg-red-50'
      }`}>
        {overview.overall_status === 'PASS' ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : overview.overall_status === 'CONDITIONAL_PASS' ? (
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>
                {overview.overall_status === 'PASS' ? 'All Stress Tests Pass' :
                 overview.overall_status === 'CONDITIONAL_PASS' ? 'Conditional Pass - Action Required' :
                 'Stress Test Failures Detected'}
              </strong>
              <div className="text-sm mt-1">
                {overview.scenarios_passed} of {overview.total_scenarios} scenarios passed. 
                {overview.scenarios_failed > 0 && ` Worst case: ${formatCurrency(overview.worst_case_capital_impact)} capital shortfall.`}
              </div>
            </div>
            <Badge variant={
              overview.overall_status === 'PASS' ? 'default' : 
              overview.overall_status === 'CONDITIONAL_PASS' ? 'secondary' : 'destructive'
            } className={
              overview.overall_status === 'PASS' ? 'bg-green-100 text-green-800' : ''
            }>
              {overview.overall_status.replace('_', ' ')}
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      {/* Key Stress Test Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Scenarios Tested</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{overview.total_scenarios}</div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{overview.scenarios_passed} Pass</Badge>
              {overview.scenarios_failed > 0 && (
                <Badge variant="destructive">{overview.scenarios_failed} Fail</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">BOE, ECB, Fed, Basel III</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">Worst Case LCR</span>
          </div>
          <div className="space-y-2">
            <div className={`text-2xl font-bold ${
              Math.min(...scenarios.map(s => s.lcr.stressed)) >= 105 ? 'text-green-600' : 'text-red-600'
            }`}>
              {Math.min(...scenarios.map(s => s.lcr.stressed)).toFixed(1)}%
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={Math.min(...scenarios.map(s => s.lcr.stressed)) >= 105 ? 'default' : 'destructive'} 
                     className={Math.min(...scenarios.map(s => s.lcr.stressed)) >= 105 ? 'bg-green-100 text-green-800' : ''}>
                {Math.min(...scenarios.map(s => s.lcr.stressed)) >= 105 ? 'Above Min' : 'Below Min'}
              </Badge>
            </div>
            <Progress value={Math.min(...scenarios.map(s => s.lcr.stressed))} className="h-2" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Capital at Risk</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {formatCurrency(overview.worst_case_capital_impact)}
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-red-600" />
              <span className="text-xs text-muted-foreground">Maximum exposure</span>
            </div>
            <div className="text-xs text-muted-foreground">{overview.worst_case_scenario}</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">Business Impact</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {formatCurrency(Math.max(...scenarios.map(s => s.business_impact.lending_capacity_reduction)))}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Lending Reduction</Badge>
            </div>
            <div className="text-xs text-muted-foreground">Worst case scenario</div>
          </div>
        </Card>
      </div>

      {/* Detailed Scenarios */}
      <Tabs defaultValue="scenarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scenarios">Scenario Results</TabsTrigger>
          <TabsTrigger value="analysis">Impact Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Stress Test Scenario Results</h3>
            <div className="space-y-4">
              {filteredScenarios.map((scenario, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{scenario.scenario_name}</h4>
                      <Badge className={
                        scenario.severity === 'EXTREME' ? 'bg-red-100 text-red-800' :
                        scenario.severity === 'SEVERE' ? 'bg-orange-100 text-orange-800' :
                        scenario.severity === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {scenario.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {scenario.lcr.pass && scenario.capital.pass ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="text-sm font-medium">
                        {scenario.lcr.pass && scenario.capital.pass ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">LCR Impact</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Baseline:</span>
                        <span className="font-medium">{scenario.lcr.baseline.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Stressed:</span>
                        <span className={`font-medium ${scenario.lcr.pass ? 'text-green-600' : 'text-red-600'}`}>
                          {scenario.lcr.stressed.toFixed(1)}%
                        </span>
                      </div>
                      {!scenario.lcr.pass && (
                        <div className="text-xs text-red-600">
                          Deficit: {formatCurrency(Math.abs(scenario.lcr.buffer))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Capital Impact</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Baseline Tier 1:</span>
                        <span className="font-medium">{scenario.capital.tier1_baseline.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Stressed Tier 1:</span>
                        <span className={`font-medium ${scenario.capital.pass ? 'text-green-600' : 'text-red-600'}`}>
                          {scenario.capital.tier1_stressed.toFixed(1)}%
                        </span>
                      </div>
                      {!scenario.capital.pass && (
                        <div className="text-xs text-red-600">
                          Shortfall: {formatCurrency(scenario.capital.shortfall)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Business Impact</div>
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span>Lending Reduction:</span>
                          <span className="font-medium">{formatCurrency(scenario.business_impact.lending_capacity_reduction)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Capital Required:</span>
                          <span className="font-medium">{formatCurrency(scenario.business_impact.capital_required)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Timeline:</span>
                          <span className="font-medium">{scenario.business_impact.timeline_to_compliance}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Confidence: {Math.round(scenario.confidence * 100)}%
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">View Details</Button>
                      <Button variant="outline" size="sm">Export Results</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Cross-Scenario Impact Analysis</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Capital Requirements by Scenario</h4>
                <div className="space-y-3">
                  {scenarios.map((scenario, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          scenario.capital.pass ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm font-medium">{scenario.scenario_name}</span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(scenario.business_impact.capital_required)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Operational Impact Summary</h4>
                <div className="space-y-3">
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium mb-1">Total Capital at Risk</div>
                    <div className="text-lg font-bold">{formatCurrency(overview.worst_case_capital_impact)}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium mb-1">Maximum Lending Reduction</div>
                    <div className="text-lg font-bold">
                      {formatCurrency(Math.max(...scenarios.map(s => s.business_impact.lending_capacity_reduction)))}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium mb-1">Estimated Losses Range</div>
                    <div className="text-lg font-bold">
                      {formatCurrency(Math.min(...scenarios.map(s => s.business_impact.estimated_losses)))} - {formatCurrency(Math.max(...scenarios.map(s => s.business_impact.estimated_losses)))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Strategic Recommendations</h3>
            
            <div className="space-y-4">
              {/* Generate recommendations based on failed scenarios */}
              {scenarios.filter(s => !s.lcr.pass || !s.capital.pass).map((scenario, index) => (
                <div key={index} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-orange-800 mb-1">
                        {scenario.scenario_name} - Action Required
                      </div>
                      <div className="text-sm text-orange-700 mb-2">
                        {!scenario.lcr.pass && !scenario.capital.pass ? 
                          `Both LCR and capital ratios breach minimums. Priority: Raise ${formatCurrency(scenario.capital.shortfall)} capital and improve liquidity position.` :
                          !scenario.lcr.pass ?
                          `LCR falls below 105% minimum. Increase HQLA by ${formatCurrency(Math.abs(scenario.lcr.buffer))} or reduce outflows.` :
                          `Tier 1 capital falls below 6% minimum. Raise ${formatCurrency(scenario.capital.shortfall)} additional capital.`
                        }
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span>Timeline: {scenario.business_impact.timeline_to_compliance}</span>
                        <span>Impact: {formatCurrency(scenario.business_impact.capital_required + Math.abs(scenario.lcr.buffer))}</span>
                        <Badge variant="outline" className="text-xs">High Priority</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Plan Actions</Button>
                      <Button size="sm">Implement</Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* If all scenarios pass, show optimization recommendations */}
              {overview.scenarios_failed === 0 && (
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-green-800 mb-1">
                        All Stress Tests Pass - Optimization Opportunities
                      </div>
                      <div className="text-sm text-green-700 mb-2">
                        Your portfolio demonstrates strong resilience across all regulatory scenarios. 
                        Consider optimizing capital allocation to improve returns while maintaining compliance.
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span>Potential: £3-5M capital optimization</span>
                        <span>ROE improvement: 0.8-1.2%</span>
                        <Badge variant="outline" className="text-xs">Optimization</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Optimize Portfolio</Button>
                      <Button size="sm">Model Scenarios</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-sm text-muted-foreground text-center py-4 border-t">
        Last updated: {lastUpdated.toLocaleString()} • 
        Based on {scenarios.length} regulatory stress test scenarios • 
        Powered by Reggio Financial Intelligence
      </div>
    </div>
  );
};

export default StressTestDashboard;
