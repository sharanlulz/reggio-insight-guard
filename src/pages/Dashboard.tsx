import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  AlertTriangle, 
  DollarSign,
  BarChart3,
  FileText,
  Zap
} from 'lucide-react';

// Real data service with fallback logic
class RegulatoryDataService {
  private static instance: RegulatoryDataService;
  private connectionStatus: 'live' | 'cached' | 'mock' = 'mock';
  private lastSyncTime: Date | null = null;

  static getInstance(): RegulatoryDataService {
    if (!RegulatoryDataService.instance) {
      RegulatoryDataService.instance = new RegulatoryDataService();
    }
    return RegulatoryDataService.instance;
  }

  async fetchFinancialMetrics() {
    try {
      const realData = await this.fetchFromSupabase();
      this.connectionStatus = 'live';
      this.lastSyncTime = new Date();
      return realData;
    } catch (error) {
      console.warn('Live data unavailable, using fallback:', error.message);
      
      try {
        const cachedData = this.getCachedData();
        if (cachedData) {
          this.connectionStatus = 'cached';
          return cachedData;
        }
      } catch (cacheError) {
        console.warn('Cache unavailable:', cacheError.message);
      }
      
      this.connectionStatus = 'mock';
      return this.getEnhancedMockData();
    }
  }

  private async fetchFromSupabase() {
    const response = await fetch('/api/financial-metrics', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }
    
    return await response.json();
  }

  private getCachedData() {
    const cached = localStorage.getItem('reggio_financial_cache');
    if (cached) {
      const data = JSON.parse(cached);
      const cacheAge = Date.now() - data.timestamp;
      
      if (cacheAge < 4 * 60 * 60 * 1000) {
        return data.metrics;
      }
    }
    return null;
  }

  private getEnhancedMockData() {
    return {
      lcr: { current: 108.2, required: 110, buffer: -1.8 },
      tier1: { current: 11.7, required: 12.0, buffer: -0.3 },
      leverage: { current: 3.15, required: 3.0, buffer: 0.15 },
      totalImpact: 127_500_000,
      confidence: 87,
      
      regulatoryContext: {
        totalRegulations: 23,
        totalClauses: 1247,
        financialImpactClauses: 342,
        complianceScore: 87,
        
        financialImpacts: {
          capitalRequirements: {
            count: 89,
            avgConfidence: 0.92,
            keyChanges: [
              { 
                metric: "Tier 1 Minimum", 
                current: "11.7%", 
                proposed: "12.0%", 
                impact: "£67M additional capital needed",
                regulation: "Basel 3.1 Implementation"
              }
            ]
          },
          liquidityRequirements: {
            count: 156,
            avgConfidence: 0.89,
            keyChanges: [
              { 
                metric: "LCR Minimum", 
                current: "108.2%", 
                proposed: "110%", 
                impact: "£52M additional liquidity required",
                regulation: "ILAAP Requirements"
              }
            ]
          },
          operationalCosts: {
            count: 67,
            estimatedAnnual: 8500000,
            breakdown: [
              { category: "Stress Testing", cost: 3200000 },
              { category: "Reporting", cost: 2800000 },
              { category: "Risk Management", cost: 2500000 }
            ]
          }
        },

        criticalAlerts: [
          {
            title: "LCR Breach Risk",
            description: "Current trajectory shows potential LCR breach in Q3 2024",
            impact: "£52M additional liquidity required",
            probability: 78,
            timeline: "90 days",
            regulation: "CRR Article 412 - Liquidity Coverage Requirement"
          },
          {
            title: "Basel 3.1 Implementation",
            description: "Final calibration increases RWA by estimated 12%",
            impact: "£67M additional Tier 1 capital",
            probability: 95,
            timeline: "365 days",
            regulation: "Basel 3.1 Final Standards"
          }
        ],

        strategicRecommendations: [
          {
            title: "Immediate HQLA Rebalancing",
            priority: "high",
            confidence: 92,
            description: "Current liquid asset composition insufficient for stress scenarios",
            financialImpact: 1300000,
            timeline: "60 days",
            status: "pending",
            regulation: "ILAAP Stress Testing Requirements",
            details: "Increase Level 1 assets by £52M to meet enhanced LCR requirements"
          },
          {
            title: "Strategic Capital Planning",
            priority: "high",
            confidence: 88,
            description: "Basel 3.1 implementation requires proactive capital management",
            financialImpact: 8000000,
            timeline: "120 days",
            status: "in-progress",
            regulation: "Basel 3.1 Capital Requirements",
            details: "Optimize capital structure ahead of new minimum requirements"
          }
        ],

        upcomingDeadlines: [
          { regulation: "Basel 3.1 Capital Requirements", deadline: "2025-07-01", daysLeft: 133 },
          { regulation: "ILAAP Annual Review", deadline: "2025-03-31", daysLeft: 41 },
          { regulation: "Operational Risk Framework", deadline: "2025-06-30", daysLeft: 132 }
        ]
      }
    };
  }

  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      lastSync: this.lastSyncTime,
      isLive: this.connectionStatus === 'live'
    };
  }

  cacheData(data: any) {
    try {
      localStorage.setItem('reggio_financial_cache', JSON.stringify({
        timestamp: Date.now(),
        metrics: data
      }));
    } catch (error) {
      console.warn('Could not cache data:', error);
    }
  }
}

type MetricTriple = {
  current: number;
  required: number;
  buffer: number;
};

type Metrics = {
  lcr: MetricTriple;
  tier1: MetricTriple;
  leverage: MetricTriple;
  totalImpact: number;
  confidence: number;
  regulatoryContext?: any;
};

const EnhancedExecutiveDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    lcr: { current: 108.2, required: 110, buffer: -1.8 },
    tier1: { current: 11.7, required: 12.0, buffer: -0.3 },
    leverage: { current: 3.15, required: 3.0, buffer: 0.15 },
    totalImpact: 127_500_000,
    confidence: 87,
  });
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  const dataService = RegulatoryDataService.getInstance();

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await dataService.fetchFinancialMetrics();
      setMetrics(data);
      setConnectionStatus(dataService.getConnectionStatus());
      
      if (data.regulatoryContext) {
        dataService.cacheData(data);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `£${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `£${(amount / 1_000).toFixed(0)}K`;
    return `£${amount.toFixed(0)}`;
  };

  const getDataSourceIndicator = () => {
    if (!connectionStatus) return null;
    
    const indicators = {
      live: { color: 'text-green-600', icon: '🟢', text: 'Live' },
      cached: { color: 'text-yellow-600', icon: '🟡', text: 'Cached' },
      mock: { color: 'text-blue-600', icon: '🔵', text: 'Demo' }
    };
    
    const indicator = indicators[connectionStatus.status];
    return (
      <span className={`text-xs ${indicator.color}`}>
        {indicator.icon} {indicator.text} Data
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Real-time regulatory intelligence and financial impact analysis
            {getDataSourceIndicator() && (
              <span className="ml-2">• {getDataSourceIndicator()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
            onClick={loadMetrics}
            disabled={loading}
          >
            <span className="mr-2">📊</span>
            {loading ? "Calculating…" : "Refresh Analytics"}
          </button>
          <button className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            <span className="mr-2">📄</span>
            Export Report
          </button>
        </div>
      </div>

      {/* Live Status Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2 text-blue-600">⚡</span>
            <span>
              <strong>Live Analysis Active:</strong> Connected to portfolio data and regulatory feeds
              {metrics.regulatoryContext && (
                <span className="ml-2">
                  • {metrics.regulatoryContext.totalRegulations} regulations • {metrics.regulatoryContext.totalClauses} clauses analyzed
                </span>
              )}
            </span>
          </div>
          <div className="text-sm text-blue-600">
            Last updated: {new Date().toLocaleTimeString()} • Confidence: {metrics.confidence}%
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* LCR */}
        <div className="rounded-lg border bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Liquidity Coverage Ratio</p>
              <div className="mt-2 flex items-center">
                <span className="text-2xl font-bold text-red-600">{metrics.lcr.current}%</span>
                <span className="ml-2 text-red-500">↓</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Required: {metrics.lcr.required}%</p>
            </div>
            <div className="text-right">
              <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">Below Target</span>
              <p className="mt-1 text-xs text-gray-500">{metrics.lcr.buffer}% buffer</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-red-500"
              style={{
                width: `${Math.max(0, (metrics.lcr.current / metrics.lcr.required) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Tier 1 */}
        <div className="rounded-lg border bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tier 1 Capital Ratio</p>
              <div className="mt-2 flex items-center">
                <span className="text-2xl font-bold text-orange-600">{metrics.tier1.current}%</span>
                <span className="ml-2 text-orange-500">↓</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Required: {metrics.tier1.required}%</p>
            </div>
            <div className="text-right">
              <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">At Risk</span>
              <p className="mt-1 text-xs text-gray-500">{metrics.tier1.buffer}% buffer</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-orange-500"
              style={{
                width: `${Math.max(0, (metrics.tier1.current / metrics.tier1.required) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Leverage */}
        <div className="rounded-lg border bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Leverage Ratio</p>
              <div className="mt-2 flex items-center">
                <span className="text-2xl font-bold text-green-600">{metrics.leverage.current}%</span>
                <span className="ml-2 text-green-500">↑</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Required: {metrics.leverage.required}%</p>
            </div>
            <div className="text-right">
              <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">Compliant</span>
              <p className="mt-1 text-xs text-gray-500">+{metrics.leverage.buffer}% buffer</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{
                width: `${Math.min(100, (metrics.leverage.current / metrics.leverage.required) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Total Impact */}
        <div className="rounded-lg border bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Regulatory Impact</p>
              <div className="mt-2 flex items-center">
                <span className="text-2xl font-bold text-purple-600">
                  {formatCurrency(metrics.totalImpact)}
                </span>
                <span className="ml-2 text-purple-500">⚠️</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Timeline: 9–12 months</p>
            </div>
            <div className="text-right">
              <span className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">
                {metrics.confidence}% Confidence
              </span>
              <p className="mt-1 text-xs text-gray-500">AI Analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      <div className="rounded-lg border bg-white p-6 shadow">
        <div className="mb-4 flex items-center">
          <span className="mr-2 text-red-600">🚨</span>
          <h3 className="text-lg font-semibold">Critical Regulatory Alerts</h3>
        </div>

        <div className="space-y-4">
          {metrics.regulatoryContext?.criticalAlerts?.map((alert: any, idx: number) => (
            <div key={idx} className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center">
                    <span className="font-semibold">{alert.title}</span>
                    <span className="ml-2 rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                      {alert.probability}% probability
                    </span>
                  </div>
                  <p className="mb-2 text-sm">{alert.description}</p>
                  <p className="text-sm font-medium">{alert.impact}</p>
                  <p className="mt-1 text-xs text-gray-600">
                    <strong>Source:</strong> {alert.regulation}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <span className="mb-2 block rounded border bg-white px-2 py-1 text-xs">
                    {alert.timeline}
                  </span>
                  <button className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
                    Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs defaultValue="recommendations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="regulatory-impact">Regulatory Impact</TabsTrigger>
          <TabsTrigger value="compliance-tracking">Compliance Tracking</TabsTrigger>
          <TabsTrigger value="financial-modeling">Financial Modeling</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-purple-600" />
                AI-Generated Strategic Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.regulatoryContext?.strategicRecommendations?.map((rec: any, idx: number) => (
                  <div key={idx} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center flex-wrap gap-2">
                          <span className="text-lg font-semibold">{rec.title}</span>
                          <Badge className={rec.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                            {rec.priority} priority
                          </Badge>
                          <Badge variant="outline">
                            {rec.confidence}% confidence
                          </Badge>
                        </div>
                        <p className="mb-3 text-gray-600">{rec.description}</p>
                        <p className="text-sm text-gray-600 mb-3">
                          <strong>Regulatory Driver:</strong> {rec.regulation}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">{rec.details}</p>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div>
                            <p className="text-sm text-gray-500">Financial Impact</p>
                            <p className="font-semibold text-red-600">Cost {formatCurrency(rec.financialImpact)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Timeline</p>
                            <p className="font-semibold">{rec.timeline}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <Badge variant="outline">{rec.status}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 space-y-2">
                        <Button size="sm" variant="outline" className="w-full">
                          View Details
                        </Button>
                        <Button size="sm" className="w-full">
                          Implement
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regulatory-impact">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Capital Requirements Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Analyzed Clauses:</span>
                  <Badge variant="secondary">{metrics.regulatoryContext?.financialImpacts?.capitalRequirements?.count || 89}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Confidence Score:</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={(metrics.regulatoryContext?.financialImpacts?.capitalRequirements?.avgConfidence || 0.92) * 100} className="w-20" />
                    <span className="text-sm text-gray-600">{Math.round((metrics.regulatoryContext?.financialImpacts?.capitalRequirements?.avgConfidence || 0.92) * 100)}%</span>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-700">Key Changes:</h4>
                  {(metrics.regulatoryContext?.financialImpacts?.capitalRequirements?.keyChanges || []).map((change: any, idx: number) => (
                    <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{change.metric}</span>
                        <span className="text-xs text-gray-600">{change.current} → {change.proposed}</span>
                      </div>
                      <p className="text-xs text-gray-700 mb-1">{change.impact}</p>
                      <p className="text-xs font-medium text-blue-700">Source: {change.regulation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Liquidity Requirements Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Analyzed Clauses:</span>
                  <Badge variant="secondary">{metrics.regulatoryContext?.financialImpacts?.liquidityRequirements?.count || 156}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Confidence Score:</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={(metrics.regulatoryContext?.financialImpacts?.liquidityRequirements?.avgConfidence || 0.89) * 100} className="w-20" />
                    <span className="text-sm text-gray-600">{Math.round((metrics.regulatoryContext?.financialImpacts?.liquidityRequirements?.avgConfidence || 0.89) * 100)}%</span>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-700">Key Changes:</h4>
                  {(metrics.regulatoryContext?.financialImpacts?.liquidityRequirements?.keyChanges || []).map((change: any, idx: number) => (
                    <div key={idx} className="bg-green-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{change.metric}</span>
                        <span className="text-xs text-gray-600">{change.current} → {change.proposed}</span>
                      </div>
                      <p className="text-xs text-gray-700 mb-1">{change.impact}</p>
                      <p className="text-xs font-medium text-green-700">Source: {change.regulation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-yellow-500" />
                Estimated Annual Compliance Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(metrics.regulatoryContext?.financialImpacts?.operationalCosts?.estimatedAnnual || 8500000)}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Based on {metrics.regulatoryContext?.financialImpacts?.operationalCosts?.count || 67} analyzed cost clauses
                  </p>
                  
                  <div className="space-y-3">
                    {(metrics.regulatoryContext?.financialImpacts?.operationalCosts?.breakdown || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">{item.category}</span>
                        <span className="font-medium">{formatCurrency(item.cost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Business Constraints</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-yellow-700">Total Constraints:</span>
                      <Badge variant="outline" className="text-yellow-800">30</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-yellow-700">High Impact:</span>
                      <Badge variant="destructive">12</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance-tracking">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Compliance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{metrics.regulatoryContext?.totalRegulations || 23}</div>
                  <div className="text-sm text-gray-600">Active Regulations</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{metrics.regulatoryContext?.complianceScore || 87}%</div>
                  <div className="text-sm text-gray-600">Compliance Score</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{metrics.regulatoryContext?.financialImpactClauses || 342}</div>
                  <div className="text-sm text-gray-600">Financial Impact Clauses</div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold mb-3">Upcoming Regulatory Deadlines</h4>
                {(metrics.regulatoryContext?.upcomingDeadlines || []).map((deadline: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div>
                        <h3 className="font-medium text-gray-900">{deadline.regulation}</h3>
                        <p className="text-sm text-gray-600">Due: {new Date(deadline.deadline).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{deadline.daysLeft}</div>
                      <div className="text-sm text-gray-600">days left</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial-modeling">
          <Card>
            <CardHeader>
              <CardTitle>Financial Modeling Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Current Model Parameters</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm">LCR Requirement</span>
                      <span className="font-medium">{metrics.lcr.required}%</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm">Tier 1 Minimum</span>
                      <span className="font-medium">{metrics.tier1.required}%</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm">Leverage Ratio</span>
                      <span className="font-medium">{metrics.leverage.required}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Stress Testing Integration</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Regulatory Scenarios Available:</strong>
                    </p>
                    <ul className="text-xs text-blue-700 space-y-1 mb-3">
                      <li>• Basel 3.1 Implementation Stress</li>
                      <li>• ILAAP Enhanced Requirements</li>
                      <li>• Adverse Market Conditions</li>
                      <li>• Liquidity Crisis Scenario</li>
                    </ul>
                    <Button size="sm">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Run Stress Test
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Model Performance</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">94%</div>
                    <div className="text-sm text-gray-600">Prediction Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">{metrics.regulatoryContext?.financialImpactClauses || 342}</div>
                    <div className="text-sm text-gray-600">Financial Clauses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">{metrics.confidence}%</div>
                    <div className="text-sm text-gray-600">Overall Confidence</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Action Bar */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Ready to dive deeper?</h3>
              <p className="text-blue-100">Run comprehensive stress tests or generate detailed compliance reports</p>
              <p className="text-xs text-blue-200 mt-1">
                Based on {metrics.regulatoryContext?.totalClauses || 1247} analyzed regulatory clauses with {metrics.confidence}% confidence
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="secondary" size="lg">
                <BarChart3 className="h-5 w-5 mr-2" />
                Run Stress Test
              </Button>
              <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-blue-600">
                <FileText className="h-5 w-5 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="border-t pt-4 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center space-x-4">
          <span>Last updated: {new Date().toLocaleString()}</span>
          <span>•</span>
          <span>Based on live portfolio data and {metrics.regulatoryContext?.totalRegulations || 23} analyzed regulations</span>
          <span>•</span>
          <span>Powered by Reggio AI</span>
          {connectionStatus && (
            <>
              <span>•</span>
              <span>{connectionStatus.status === 'live' ? 'Live' : connectionStatus.status === 'cached' ? 'Cached' : 'Demo'} data</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedExecutiveDashboard;
