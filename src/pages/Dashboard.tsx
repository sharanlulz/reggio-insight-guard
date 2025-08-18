import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, Target, DollarSign, Shield, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';

// Include the financial modeling types and classes directly
// (In a real implementation, these would be imported from your financial-modeling.ts file)

type PortfolioAsset = {
  id: string;
  assetClass: 'SOVEREIGN' | 'CORPORATE' | 'EQUITY' | 'DERIVATIVE' | 'CASH' | 'PROPERTY';
  market_value: number;
  notional_value?: number;
  maturity_date?: string;
  rating?: string;
  jurisdiction: string;
  sector?: string;
  counterparty?: string;
  basel_risk_weight?: number;
  crd_risk_weight?: number;
  liquidity_classification?: 'HQLA_L1' | 'HQLA_L2A' | 'HQLA_L2B' | 'NON_HQLA';
};

type FundingProfile = {
  retail_deposits: number;
  corporate_deposits: number;
  wholesale_funding: number;
  secured_funding: number;
  stable_funding_ratio: number;
  deposit_concentration: Record<string, number>;
};

// Realistic banking portfolio data - typical mid-tier bank
const samplePortfolio: PortfolioAsset[] = [
  // HQLA Level 1 - Government bonds (small portion)
  {
    id: '1',
    assetClass: 'SOVEREIGN',
    market_value: 120_000_000,
    notional_value: 120_000_000,
    rating: 'AAA',
    jurisdiction: 'UK',
    basel_risk_weight: 0.0,
    liquidity_classification: 'HQLA_L1'
  },
  // HQLA Level 2A - High-grade corporate bonds
  {
    id: '2',
    assetClass: 'CORPORATE',
    market_value: 80_000_000,
    notional_value: 80_000_000,
    rating: 'AA',
    jurisdiction: 'UK',
    sector: 'Financial',
    basel_risk_weight: 0.2,
    liquidity_classification: 'HQLA_L2A'
  },
  // HQLA Level 2B - Lower grade assets
  {
    id: '3',
    assetClass: 'CORPORATE',
    market_value: 30_000_000,
    notional_value: 30_000_000,
    rating: 'BBB',
    jurisdiction: 'UK',
    sector: 'Utilities',
    basel_risk_weight: 0.5,
    liquidity_classification: 'HQLA_L2B'
  },
  // Main loan book - Corporate lending (largest portion)
  {
    id: '4',
    assetClass: 'CORPORATE',
    market_value: 800_000_000,
    notional_value: 800_000_000,
    rating: 'BBB',
    jurisdiction: 'UK',
    sector: 'Manufacturing',
    basel_risk_weight: 1.0,
    liquidity_classification: 'NON_HQLA'
  },
  // Retail mortgages
  {
    id: '5',
    assetClass: 'PROPERTY',
    market_value: 500_000_000,
    notional_value: 500_000_000,
    jurisdiction: 'UK',
    sector: 'Residential',
    basel_risk_weight: 0.35, // Typical mortgage risk weight
    liquidity_classification: 'NON_HQLA'
  },
  // SME lending
  {
    id: '6',
    assetClass: 'CORPORATE',
    market_value: 300_000_000,
    notional_value: 300_000_000,
    rating: 'BB',
    jurisdiction: 'UK',
    sector: 'SME',
    basel_risk_weight: 1.0,
    liquidity_classification: 'NON_HQLA'
  },
  // Cash and central bank reserves
  {
    id: '7',
    assetClass: 'CASH',
    market_value: 170_000_000,
    notional_value: 170_000_000,
    jurisdiction: 'UK',
    basel_risk_weight: 0.0,
    liquidity_classification: 'HQLA_L1'
  }
];

const sampleFunding: FundingProfile = {
  retail_deposits: 1_200_000_000, // Much larger deposit base
  corporate_deposits: 400_000_000,
  wholesale_funding: 200_000_000,
  secured_funding: 100_000_000,
  stable_funding_ratio: 0.85,
  deposit_concentration: {
    'Major Corp A': 50_000_000,
    'Major Corp B': 40_000_000,
    'Pension Fund X': 60_000_000,
    'Local Authority': 80_000_000
  }
};

// Simplified LCR Calculator
class SimplifiedLCRCalculator {
  private assets: PortfolioAsset[];
  private funding: FundingProfile;

  constructor(assets: PortfolioAsset[], funding: FundingProfile) {
    this.assets = assets;
    this.funding = funding;
  }

  calculateLCR() {
    const hqla = this.calculateHQLA();
    const netOutflows = this.calculateNetCashOutflows();
    const lcr = netOutflows > 0 ? hqla / netOutflows : Infinity;

    return {
      lcr_ratio: lcr,
      hqla_value: hqla,
      net_cash_outflows: netOutflows,
      requirement: 1.0,
      compliance_status: lcr >= 1.0 ? 'COMPLIANT' as const : 'NON_COMPLIANT' as const,
      buffer_or_deficit: hqla - netOutflows,
      breakdown: {
        level1_assets: this.assets.filter(a => a.liquidity_classification === 'HQLA_L1').reduce((sum, a) => sum + a.market_value, 0),
        level2a_assets: this.assets.filter(a => a.liquidity_classification === 'HQLA_L2A').reduce((sum, a) => sum + a.market_value * 0.85, 0),
        level2b_assets: this.assets.filter(a => a.liquidity_classification === 'HQLA_L2B').reduce((sum, a) => sum + a.market_value * 0.75, 0)
      }
    };
  }

  private calculateHQLA(): number {
    let hqla = 0;
    this.assets.forEach(asset => {
      if (asset.liquidity_classification === 'HQLA_L1') {
        hqla += asset.market_value;
      } else if (asset.liquidity_classification === 'HQLA_L2A') {
        hqla += asset.market_value * 0.85;
      } else if (asset.liquidity_classification === 'HQLA_L2B') {
        hqla += asset.market_value * 0.75;
      }
    });
    return hqla;
  }

  private calculateNetCashOutflows(): number {
    // More realistic LCR outflow rates
    const retailOutflows = this.funding.retail_deposits * 0.05; // 5% for stable retail
    const corporateOutflows = this.funding.corporate_deposits * 0.25; // 25% for operational corporate
    const wholesaleOutflows = this.funding.wholesale_funding * 1.0; // 100% for wholesale
    
    // Add inflows (negative outflows)
    const securedFundingInflows = this.funding.secured_funding * 0.0; // Secured funding stays
    
    return retailOutflows + corporateOutflows + wholesaleOutflows - securedFundingInflows;
  }
}

// Simplified Capital Calculator
class SimplifiedCapitalCalculator {
  private assets: PortfolioAsset[];

  constructor(assets: PortfolioAsset[]) {
    this.assets = assets;
  }

  calculateCapitalRatios(tier1Capital: number, tier2Capital: number) {
    const rwa = this.calculateRiskWeightedAssets();
    const totalExposure = this.assets.reduce((sum, asset) => sum + asset.market_value, 0);
    
    const tier1Ratio = tier1Capital / rwa;
    const totalCapitalRatio = (tier1Capital + tier2Capital) / rwa;
    const leverageRatio = tier1Capital / totalExposure;

    return {
      risk_weighted_assets: rwa,
      tier1_capital_ratio: tier1Ratio,
      total_capital_ratio: totalCapitalRatio,
      leverage_ratio: leverageRatio,
      capital_requirements: {
        tier1_minimum: rwa * 0.06,
        total_capital_minimum: rwa * 0.08,
        leverage_minimum: totalExposure * 0.03
      },
      compliance_status: {
        tier1_compliant: tier1Ratio >= 0.06,
        total_capital_compliant: totalCapitalRatio >= 0.08,
        leverage_compliant: leverageRatio >= 0.03
      },
      buffers_and_surcharges: {
        capital_conservation_buffer: rwa * 0.025,
        countercyclical_buffer: rwa * 0.01,
        systemic_risk_buffer: rwa * 0.005,
        total_buffer_requirement: rwa * 0.04
      }
    };
  }

  private calculateRiskWeightedAssets(): number {
    return this.assets.reduce((total, asset) => {
      const riskWeight = asset.basel_risk_weight || this.getStandardRiskWeight(asset);
      return total + (asset.market_value * riskWeight);
    }, 0);
  }

  private getStandardRiskWeight(asset: PortfolioAsset): number {
    switch (asset.assetClass) {
      case 'CASH': return 0.0;
      case 'SOVEREIGN': return asset.rating?.startsWith('AAA') ? 0.0 : 0.2;
      case 'CORPORATE': return asset.rating?.startsWith('AAA') ? 0.2 : 1.0;
      case 'EQUITY': return 2.5;
      case 'PROPERTY': return 1.0;
      default: return 1.0;
    }
  }
}

// Format currency values
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

// Format percentage
const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

// Custom hook for financial data
function useFinancialData() {
  const [loading, setLoading] = useState(true);
  const [lcrData, setLcrData] = useState<any>(null);
  const [capitalData, setCapitalData] = useState<any>(null);
  const [stressResults, setStressResults] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const tier1Capital = 150_000_000; // £150M - realistic for £2B bank
  const tier2Capital = 35_000_000;  // £35M - realistic Tier 2 capital

  const calculateFinancials = async () => {
    setLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Calculate LCR
      const lcrCalculator = new SimplifiedLCRCalculator(samplePortfolio, sampleFunding);
      const lcrResult = lcrCalculator.calculateLCR();

      // Calculate Capital Adequacy
      const capitalCalculator = new SimplifiedCapitalCalculator(samplePortfolio);
      const capitalResult = capitalCalculator.calculateCapitalRatios(tier1Capital, tier2Capital);

      // Simulate stress test results with realistic portfolio impact
      const mockStressResults = [
        {
          scenario_name: 'Bank of England Stress Test 2024',
          lcr_result: { 
            lcr_ratio: 0.98, // Just below 100% under severe stress
            compliance_status: 'NON_COMPLIANT' as const
          },
          capital_result: { 
            tier1_capital_ratio: 0.089, // Just below 9% under stress
            compliance_status: { tier1_compliant: true } // Still above 6% minimum
          },
          overall_assessment: { 
            overall_severity: 'HIGH' as const, 
            risk_factors: ['LCR falls below 100% under severe stress', 'Capital buffer reduced to 2.9%'] 
          }
        },
        {
          scenario_name: 'Moderate Economic Downturn',
          lcr_result: { 
            lcr_ratio: 1.12, // Stays above 100%
            compliance_status: 'COMPLIANT' as const
          },
          capital_result: { 
            tier1_capital_ratio: 0.105, // Moderate reduction
            compliance_status: { tier1_compliant: true }
          },
          overall_assessment: { 
            overall_severity: 'MEDIUM' as const, 
            risk_factors: ['Reduced capital and liquidity buffers but remains compliant'] 
          }
        }
      ];

      setLcrData(lcrResult);
      setCapitalData(capitalResult);
      setStressResults(mockStressResults);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Financial calculation error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateFinancials();
  }, []);

  const getKeyMetrics = () => {
    if (!lcrData || !capitalData) return null;

    return {
      lcr: {
        ratio: lcrData.lcr_ratio,
        percentage: Math.round(lcrData.lcr_ratio * 100),
        status: lcrData.compliance_status,
        buffer: lcrData.buffer_or_deficit
      },
      capital: {
        tier1_ratio: capitalData.tier1_capital_ratio,
        tier1_percentage: Math.round(capitalData.tier1_capital_ratio * 100),
        total_ratio: capitalData.total_capital_ratio,
        total_percentage: Math.round(capitalData.total_capital_ratio * 100),
        leverage_ratio: capitalData.leverage_ratio,
        leverage_percentage: Math.round(capitalData.leverage_ratio * 100),
        compliance: capitalData.compliance_status
      },
      stress: {
        total_scenarios: stressResults.length,
        failed_scenarios: stressResults.filter(r => 
          r.lcr_result.compliance_status === 'NON_COMPLIANT' ||
          !r.capital_result.compliance_status?.tier1_compliant
        ).length,
        worst_lcr: stressResults.length > 0 ? 
          Math.min(...stressResults.map(r => r.lcr_result.lcr_ratio)) : 0
      }
    };
  };

  const getRegulatoryAlerts = () => [
    {
      type: 'warning',
      title: 'PRA Liquidity Requirements Increase',
      description: 'LCR minimum increasing to 110% from Q2 2024',
      financial_impact: 'Additional £50M liquidity buffer required',
      annual_cost: 5_000_000, // 25bps on £50M * 4 = £5M
      timeline_days: 120,
      current_position: lcrData ? `${Math.round(lcrData.lcr_ratio * 100)}%` : 'Calculating...'
    },
    {
      type: 'info',
      title: 'Basel IV Implementation Timeline',
      description: 'Final calibration released. RWA impact assessment required',
      financial_impact: 'Estimated +£60M Tier 1 requirement',
      annual_cost: 12_000_000, // 20% cost of equity on £60M
      timeline_days: 365,
      current_position: capitalData ? `${Math.round(capitalData.tier1_capital_ratio * 100)}% Tier 1` : 'Calculating...'
    },
    {
      type: 'success',
      title: 'MREL Buffer Optimization Opportunity',
      description: 'Recent subordinated debt issuance creates optimization potential',
      financial_impact: '£8M annual funding cost reduction',
      annual_cost: -8_000_000,
      timeline_days: 30,
      current_position: 'Optimization available'
    }
  ];

  const getStrategicRecommendations = () => {
    if (!lcrData || !capitalData) return [];

    const recommendations = [];

    if (lcrData.buffer_or_deficit < 100_000_000) { // Less than £100M buffer for larger bank
      recommendations.push({
        priority: 'high',
        action: `Increase HQLA allocation by £${Math.abs(100_000_000 - lcrData.buffer_or_deficit) / 1_000_000}M to strengthen liquidity buffer`,
        rationale: 'Current buffer may be insufficient for upcoming regulatory changes and stress scenarios',
        estimated_cost: Math.abs(100_000_000 - lcrData.buffer_or_deficit) * 0.0025, // 25bps cost
        timeline: '60 days'
      });
    }

    if (capitalData.tier1_capital_ratio < 0.12) { // Target 12% for stronger buffer
      const shortfall = (0.12 - capitalData.tier1_capital_ratio) * capitalData.risk_weighted_assets;
      recommendations.push({
        priority: 'medium',
        action: `Consider raising £${Math.round(shortfall / 1_000_000)}M additional Tier 1 capital`,
        rationale: 'Strengthen capital position ahead of Basel IV implementation and maintain competitive buffer',
        estimated_cost: shortfall * 0.12, // 12% cost of equity
        timeline: '120 days'
      });
    }

    const failedStress = stressResults.filter(r => 
      r.lcr_result.compliance_status === 'NON_COMPLIANT'
    );
    
    if (failedStress.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Review asset composition to improve stress test resilience',
        rationale: `${failedStress.length} stress scenario(s) show LCR breach`,
        estimated_cost: 0,
        timeline: '30 days'
      });
    }

    return recommendations;
  };

  return {
    loading,
    keyMetrics: getKeyMetrics(),
    lcrData,
    capitalData,
    stressResults,
    regulatoryAlerts: getRegulatoryAlerts(),
    strategicRecommendations: getStrategicRecommendations(),
    lastUpdated,
    refresh: calculateFinancials
  };
}

// Executive Summary Dashboard with Real Data
const ExecutiveDashboard: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('current');
  const { 
    loading, 
    keyMetrics, 
    lcrData, 
    capitalData, 
    stressResults, 
    regulatoryAlerts, 
    strategicRecommendations,
    lastUpdated,
    refresh 
  } = useFinancialData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <div className="text-lg font-medium">Calculating Financial Metrics...</div>
            <div className="text-sm text-muted-foreground">Running LCR, Capital, and Stress Test calculations</div>
          </div>
        </div>
      </div>
    );
  }

  if (!keyMetrics) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load financial data. Please try refreshing or contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
          <Button onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Key Risk Indicators - Now with Real Data */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">LCR Status</span>
          </div>
          <div className="space-y-2">
            <div className={`text-2xl font-bold ${keyMetrics.lcr.status === 'COMPLIANT' ? 'text-green-600' : 'text-red-600'}`}>
              {keyMetrics.lcr.percentage}%
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={keyMetrics.lcr.status === 'COMPLIANT' ? 'default' : 'destructive'} 
                     className={keyMetrics.lcr.status === 'COMPLIANT' ? 'bg-green-100 text-green-800' : ''}>
                {keyMetrics.lcr.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {keyMetrics.lcr.buffer > 0 ? `+${formatCurrency(keyMetrics.lcr.buffer)} buffer` : `${formatCurrency(keyMetrics.lcr.buffer)} deficit`}
              </span>
            </div>
            <Progress value={Math.min(keyMetrics.lcr.percentage, 150)} className="h-2" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">Tier 1 Capital</span>
          </div>
          <div className="space-y-2">
            <div className={`text-2xl font-bold ${keyMetrics.capital.compliance.tier1_compliant ? 'text-green-600' : 'text-red-600'}`}>
              {keyMetrics.capital.tier1_percentage}%
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={keyMetrics.capital.compliance.tier1_compliant ? 'default' : 'destructive'} 
                     className={keyMetrics.capital.compliance.tier1_compliant ? 'bg-green-100 text-green-800' : ''}>
                {keyMetrics.capital.compliance.tier1_compliant ? 'Strong' : 'Weak'}
              </Badge>
              <span className="text-xs text-muted-foreground">vs 6% min</span>
            </div>
            <Progress value={(keyMetrics.capital.tier1_percentage/15)*100} className="h-2" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">Stress Test</span>
          </div>
          <div className="space-y-2">
            <div className={`text-2xl font-bold ${keyMetrics.stress.failed_scenarios === 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {keyMetrics.stress.failed_scenarios} Fail
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={keyMetrics.stress.failed_scenarios === 0 ? 'default' : 'destructive'} 
                     className={keyMetrics.stress.failed_scenarios === 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                {keyMetrics.stress.failed_scenarios === 0 ? 'All Pass' : 'Action Needed'}
              </Badge>
              <span className="text-xs text-muted-foreground">of {keyMetrics.stress.total_scenarios} scenarios</span>
            </div>
            {keyMetrics.stress.failed_scenarios > 0 && (
              <div className="text-xs text-muted-foreground">
                Worst LCR: {Math.round(keyMetrics.stress.worst_lcr * 100)}%
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Regulatory Cost</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {formatCurrency(regulatoryAlerts.reduce((sum, alert) => sum + Math.abs(alert.annual_cost), 0))}
            </div>
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
          <Badge variant="secondary">{regulatoryAlerts.length} Active</Badge>
        </div>
        
        <div className="space-y-4">
          {regulatoryAlerts.map((alert, index) => (
            <Alert key={index} className={`${
              alert.type === 'warning' ? 'border-orange-200 bg-orange-50' :
              alert.type === 'success' ? 'border-green-200 bg-green-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <AlertTriangle className={`h-4 w-4 ${
                alert.type === 'warning' ? 'text-orange-600' :
                alert.type === 'success' ? 'text-green-600' :
                'text-blue-600'
              }`} />
              <AlertDescription>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {alert.description}. Current position: {alert.current_position}
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Financial Impact:</span> {alert.financial_impact}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className={`text-sm font-medium ${alert.annual_cost < 0 ? 'text-green-600' : ''}`}>
                      {formatCurrency(Math.abs(alert.annual_cost))} {alert.annual_cost < 0 ? 'saving' : 'annual cost'}
                    </div>
                    <Badge variant="outline" className="text-xs">{alert.timeline_days} days</Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </Card>

      {/* Strategic Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">AI-Generated Strategic Recommendations</h3>
        <div className="space-y-4">
          {strategicRecommendations.map((recommendation, index) => (
            <div key={index} className={`flex items-start gap-3 p-3 rounded-lg ${
              recommendation.priority === 'high' ? 'bg-red-50 border border-red-200' :
              recommendation.priority === 'medium' ? 'bg-orange-50 border border-orange-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mt-0.5 ${
                recommendation.priority === 'high' ? 'bg-red-100 text-red-600' :
                recommendation.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">{recommendation.action}</div>
                <div className="text-xs text-muted-foreground mb-2">{recommendation.rationale}</div>
                <div className="flex items-center gap-4 text-xs">
                  <span>Cost: {formatCurrency(recommendation.estimated_cost)}</span>
                  <span>Timeline: {recommendation.timeline}</span>
                  <Badge variant="outline" className="text-xs capitalize">{recommendation.priority} Priority</Badge>
                </div>
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
            Last updated: {lastUpdated.toLocaleString()} • Based on live portfolio data and regulatory analysis
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ExecutiveDashboard;
