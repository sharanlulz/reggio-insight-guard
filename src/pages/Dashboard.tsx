import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, TrendingDown, Target, DollarSign, Shield, BarChart3, AlertCircle } from 'lucide-react';

// Mock data based on our financial modeling engine
const mockLCRData = {
  lcr_ratio: 1.15,
  hqla_value: 230000000,
  net_cash_outflows: 200000000,
  requirement: 1.0,
  compliance_status: 'COMPLIANT' as const,
  buffer_or_deficit: 30000000
};

const mockStressResults = [
  {
    scenario_name: 'Bank of England Stress Test',
    lcr_result: { lcr_ratio: 0.95, compliance_status: 'NON_COMPLIANT' as const },
    capital_result: { tier1_capital_ratio: 0.08 },
    overall_assessment: { 
      overall_severity: 'HIGH' as const, 
      risk_factors: ['LCR breach under stress'] 
    }
  },
  {
    scenario_name: 'Moderate Economic Downturn',
    lcr_result: { lcr_ratio: 1.08, compliance_status: 'COMPLIANT' as const },
    capital_result: { tier1_capital_ratio: 0.10 },
    overall_assessment: { 
      overall_severity: 'MEDIUM' as const, 
      risk_factors: ['Reduced buffer'] 
    }
  }
];

const mockRecommendations = [
  'Increase HQLA allocation by £25M before Q2 2024',
  'Consider subordinated debt issuance to maintain capital buffers',
  'Review corporate deposit concentration limits'
];

// Executive Summary Dashboard
const ExecutiveDashboard: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('current');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Regulatory Intelligence Dashboard</h1>
          <p className="text-muted-foreground">Real-time regulatory risk and capital adequacy monitoring</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedTimeframe} 
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border rounded-md px-3 py-2 bg-background"
          >
            <option value="current">Current Position</option>
            <option value="1m">1 Month Projection</option>
            <option value="3m">3 Month Projection</option>
            <option value="1y">1 Year Projection</option>
          </select>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Key Risk Indicators */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">LCR Status</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">115%</div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-100 text-green-800">Compliant</Badge>
              <span className="text-xs text-muted-foreground">+15% buffer</span>
            </div>
            <Progress value={115} className="h-2" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">Tier 1 Capital</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">12.0%</div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-100 text-green-800">Strong</Badge>
              <span className="text-xs text-muted-foreground">vs 6% min</span>
            </div>
            <Progress value={80} className="h-2" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">Stress Test</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-orange-600">1 Fail</div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="bg-orange-100 text-orange-800">Action Needed</Badge>
              <span className="text-xs text-muted-foreground">of 2 scenarios</span>
            </div>
            <div className="text-xs text-muted-foreground">BoE stress fails LCR</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Regulatory Cost</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">£2.5M</div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs text-muted-foreground">Annual estimate</span>
            </div>
            <div className="text-xs text-muted-foreground">Upcoming reg changes</div>
          </div>
        </Card>
      </div>

      {/* Regulatory Alerts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Regulatory Alerts & Impact Analysis
          </h3>
          <Badge variant="secondary">3 Active</Badge>
        </div>
        
        <div className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">PRA Liquidity Requirements Increase</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    LCR minimum increasing to 110% from Q2 2024. Current position: 115%
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Financial Impact:</span> Additional £25M liquidity buffer required
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm font-medium">£2.5M annual cost</div>
                  <Badge variant="outline" className="text-xs">120 days</Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Basel IV Implementation Timeline</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Final calibration released. RWA impact assessment required.
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Capital Impact:</span> Estimated +£15M Tier 1 requirement
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm font-medium">£1.2M annual cost</div>
                  <Badge variant="outline" className="text-xs">365 days</Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">MREL Buffer Optimization Opportunity</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Recent subordinated debt issuance creates optimization potential
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Potential Saving:</span> £3M annual funding cost reduction
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm font-medium text-green-600">-£3.0M saving</div>
                  <Badge variant="outline" className="text-xs">30 days</Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </Card>

      {/* Capital & Liquidity Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Capital Adequacy Analysis</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Tier 1 Capital Ratio</span>
                <span className="font-medium">12.0%</span>
              </div>
              <Progress value={80} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Minimum: 6%</span>
                <span>Target: 15%</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Capital Ratio</span>
                <span className="font-medium">15.0%</span>
              </div>
              <Progress value={93} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Minimum: 8%</span>
                <span>Target: 16%</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Leverage Ratio</span>
                <span className="font-medium">8.0%</span>
              </div>
              <Progress value={100} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Minimum: 3%</span>
                <span>Well above minimum</span>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="text-sm font-medium mb-2">Capital Buffers</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conservation Buffer</span>
                  <span>£12.5M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Countercyclical Buffer</span>
                  <span>£5.0M</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Total Buffer Requirement</span>
                  <span>£20.0M</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Liquidity Position</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Liquidity Coverage Ratio</span>
                <span className="font-medium text-green-600">115%</span>
              </div>
              <Progress value={115} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Requirement: 100%</span>
                <span>Buffer: £30M</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              <div className="space-y-3">
                <div className="text-sm font-medium">HQLA Composition</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Level 1 Assets</span>
                    <span>£180M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Level 2A Assets</span>
                    <span>£40M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Level 2B Assets</span>
                    <span>£10M</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-sm font-medium">Funding Sources</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Retail Deposits</span>
                    <span>£200M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Corporate Deposits</span>
                    <span>£100M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wholesale Funding</span>
                    <span>£50M</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Stress Testing Results */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Stress Testing Results
          </h3>
          <Button variant="outline" size="sm">Run New Scenario</Button>
        </div>
        
        <div className="space-y-4">
          {mockStressResults.map((result, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">{result.scenario_name}</div>
                <Badge variant={result.overall_assessment.overall_severity === 'HIGH' ? 'destructive' : 
                               result.overall_assessment.overall_severity === 'MEDIUM' ? 'secondary' : 'default'}>
                  {result.overall_assessment.overall_severity} RISK
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">LCR Under Stress</div>
                  <div className="font-medium flex items-center gap-2">
                    <span className={result.lcr_result.compliance_status === 'COMPLIANT' ? 'text-green-600' : 'text-red-600'}>
                      {(result.lcr_result.lcr_ratio * 100).toFixed(1)}%
                    </span>
                    <Badge variant={result.lcr_result.compliance_status === 'COMPLIANT' ? 'default' : 'destructive'} className="text-xs">
                      {result.lcr_result.compliance_status}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Tier 1 Ratio</div>
                  <div className="font-medium">
                    {(result.capital_result.tier1_capital_ratio * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {result.overall_assessment.risk_factors.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm font-medium mb-1">Risk Factors:</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {result.overall_assessment.risk_factors.map((factor, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Strategic Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">AI-Generated Strategic Recommendations</h3>
        <div className="space-y-4">
          {mockRecommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600 mt-0.5">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm">{recommendation}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Review</Button>
                <Button size="sm">Implement</Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleString()} • Based on latest regulatory changes and portfolio analysis
          </div>
        </div>
      </Card>
    </div>
  );
};

// Risk Manager Workbench
const RiskManagerWorkbench: React.FC = () => {
  const [activeTab, setActiveTab] = useState('modeling');
  const [calculating, setCalculating] = useState(false);

  const tabs = [
    { id: 'modeling', label: 'Financial Modeling', icon: BarChart3 },
    { id: 'scenarios', label: 'Stress Scenarios', icon: AlertTriangle },
    { id: 'regulatory', label: 'Regulatory Analysis', icon: Shield },
    { id: 'reports', label: 'Report Generation', icon: DollarSign }
  ];

  const runCalculation = async (type: string) => {
    setCalculating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCalculating(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Risk Manager Workbench</h1>
        <p className="text-muted-foreground">Advanced tools for regulatory compliance and risk analysis</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Financial Modeling Tab */}
      {activeTab === 'modeling' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Liquidity Coverage Ratio</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">HQLA Value</label>
                  <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" defaultValue="230000000" />
                </div>
                <div>
                  <label className="text-sm font-medium">Net Cash Outflows</label>
                  <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" defaultValue="200000000" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">LCR Requirement</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-md">
                  <option value="1.0">100% (Current)</option>
                  <option value="1.1">110% (Proposed)</option>
                  <option value="1.2">120% (Stress)</option>
                </select>
              </div>
              <Button 
                onClick={() => runCalculation('LCR')} 
                disabled={calculating}
                className="w-full"
              >
                {calculating ? 'Calculating...' : 'Calculate LCR'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Capital Adequacy</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tier 1 Capital</label>
                  <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" defaultValue="60000000" />
                </div>
                <div>
                  <label className="text-sm font-medium">Risk Weighted Assets</label>
                  <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" defaultValue="500000000" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Regulatory Framework</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-md">
                  <option value="basel3">Basel III</option>
                  <option value="basel4">Basel IV (Implementation)</option>
                  <option value="crd5">CRD5/CRR2</option>
                </select>
              </div>
              <Button 
                onClick={() => runCalculation('Capital')} 
                disabled={calculating}
                className="w-full"
              >
                {calculating ? 'Calculating...' : 'Calculate Capital Ratios'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Other tabs */}
      {activeTab !== 'modeling' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="text-muted-foreground">
            This section is under development. Advanced tools for {activeTab} will be available soon.
          </p>
        </Card>
      )}
    </div>
  );
};

// Main App Component
const ReggioFinancialIntelligenceDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState('executive');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="font-bold text-xl text-blue-600">Reggio</div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('executive')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'executive'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Executive Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('workbench')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'workbench'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Risk Workbench
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                Last sync: 2 min ago
              </Badge>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'executive' && <ExecutiveDashboard />}
        {currentView === 'workbench' && <RiskManagerWorkbench />}
      </main>
    </div>
  );
};

export default ReggioFinancialIntelligenceDashboard;
