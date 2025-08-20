import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  BarChart3,
  FileText,
  Shield,
  Zap,
  RefreshCw
} from 'lucide-react';

// Types from your existing code
type MetricTriple = {
  current: number;
  required: number;
  buffer: number; // difference (+/-)
};

type Metrics = {
  lcr: MetricTriple;
  tier1: MetricTriple;
  leverage: MetricTriple;
  totalImpact: number;
  confidence: number;
};

// Enhanced regulatory data that connects to your financial metrics
const mockRegulatoryData = {
  totalRegulations: 23,
  totalClauses: 1247,
  financialImpactClauses: 342,
  lastUpdated: "2025-01-20T14:30:00Z",
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
          regulation: "Basel 3.1 Implementation",
          daysUntil: 365
        },
        { 
          metric: "Leverage Ratio", 
          current: "3.15%", 
          proposed: "3.0%", 
          impact: "Currently compliant with buffer",
          regulation: "CRR Article 429",
          daysUntil: 90
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
          regulation: "ILAAP Requirements",
          daysUntil: 90
        },
        { 
          metric: "NSFR Target", 
          current: "98%", 
          proposed: "100%", 
          impact: "Funding profile adjustment needed",
          regulation: "CRR Part Six",
          daysUntil: 180
        }
      ]
    }
  },

  criticalAlerts: [
    {
      id: 1,
      type: "liquidity",
      severity: "high",
      title: "LCR Breach Risk",
      description: "Current trajectory shows potential LCR breach in Q3 2024",
      impact: "£52M additional liquidity required",
      probability: 78,
      timeline: "90 days",
      regulation: "CRR Article 412 - Liquidity Coverage Requirement",
      status: "action_required",
      confidence: 92
    },
    {
      id: 2,
      type: "capital",
      severity: "high", 
      title: "Basel 3.1 Implementation",
      description: "Final calibration increases RWA by estimated 12%",
      impact: "£67M additional Tier 1 capital",
      probability: 95,
      timeline: "365 days",
      regulation: "Basel 3.1 Final Standards",
      status: "planning",
      confidence: 88
    }
  ],

  strategicRecommendations: [
    {
      id: 1,
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
      id: 2,
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
  ]
};

const IntegratedExecutiveDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('quarterly');

  // Your existing financial metrics
  const metrics: Metrics = {
    lcr: { current: 108.2, required: 110, buffer: -1.8 },
    tier1: { current: 11.7, required: 12.0, buffer: -0.3 },
    leverage: { current: 3.15, required: 3.0, buffer: 0.15 },
    totalImpact: 127_500_000,
    confidence: 87,
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `£${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `£${(amount / 1_000).toFixed(0)}K`;
    return `£${amount.toFixed(0)}`;
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'; 
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'action_required': return 'text-red-600';
      case 'planning': return 'text-yellow-600';
      case 'in-progress': return 'text-blue-600';
      case 'pending': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getMetricStatusColor = (buffer: number) => {
    if (buffer < 0) return { bg: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-100 text-red-800', label: 'Below Target', arrow: '↓' };
    if (buffer < 0.5) return { bg: 'bg-orange-500', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-800', label: 'At Risk', arrow: '↓' };
    return { bg: 'bg-green-500', text: 'text-green-600', badge: 'bg-green-100 text-green-800', label: 'Compliant', arrow: '↑' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header - keeping your functionality */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
            <p className="mt-1 text-gray-600">
              Real-time regulatory intelligence and financial impact analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setLoading((s) => !s)}
              disabled={loading}
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Calculating..." : "Refresh Analytics"}
            </Button>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Live Status Banner - enhanced with regulatory context */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="mr-2 h-5 w-5 text-blue-600" />
              <span>
                <strong>Live Analysis Active:</strong> Connected to portfolio data and regulatory feeds
              </span>
            </div>
            <div className="text-sm text-blue-600">
              Last updated: {new Date().toLocaleTimeString()} • {mockRegulatoryData.totalClauses} clauses analyzed • Confidence: {metrics.confidence}%
            </div>
          </div>
        </div>

        {/* Key Financial Metrics - your existing layout enhanced */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* LCR Metric */}
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Liquidity Coverage Ratio</p>
                  <div className="mt-2 flex items-center">
                    <span className="text-2xl font-bold text-red-600">{metrics.lcr.current}%</span>
                    <span className="ml-2 text-red-500">↓</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Required: {metrics.lcr.required}%</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-red-100 text-red-800">Below Target</Badge>
                  <p className="mt-1 text-xs text-gray-500">{metrics.lcr.buffer}% buffer</p>
                </div>
              </div>
              
              <div className="h-2 rounded-full bg-gray-200 mb-3">
                <div
                  className="h-2 rounded-full bg-red-500"
                  style={{
                    width: `${Math.max(0, (metrics.lcr.current / metrics.lcr.required) * 100)}%`,
                  }}
                />
              </div>
              
              {/* Regulatory Context */}
              <div className="bg-red-50 p-2 rounded text-xs">
                <p className="font-medium text-red-800">Regulatory Driver:</p>
                <p className="text-red-700">ILAAP Requirements - 156 clauses analyzed</p>
              </div>
            </CardContent>
          </Card>

          {/* Tier 1 Metric */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tier 1 Capital Ratio</p>
                  <div className="mt-2 flex items-center">
                    <span className="text-2xl font-bold text-orange-600">{metrics.tier1.current}%</span>
                    <span className="ml-2 text-orange-500">↓</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Required: {metrics.tier1.required}%</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-orange-100 text-orange-800">At Risk</Badge>
                  <p className="mt-1 text-xs text-gray-500">{metrics.tier1.buffer}% buffer</p>
                </div>
              </div>
              
              <div className="h-2 rounded-full bg-gray-200 mb-3">
                <div
                  className="h-2 rounded-full bg-orange-500"
                  style={{
                    width: `${Math.max(0, (metrics.tier1.current / metrics.tier1.required) * 100)}%`,
                  }}
                />
              </div>
              
              {/* Regulatory Context */}
              <div className="bg-orange-50 p-2 rounded text-xs">
                <p className="font-medium text-orange-800">Regulatory Driver:</p>
                <p className="text-orange-700">Basel 3.1 - 89 capital clauses analyzed</p>
              </div>
            </CardContent>
          </Card>

          {/* Leverage Metric */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Leverage Ratio</p>
                  <div className="mt-2 flex items-center">
                    <span className="text-2xl font-bold text-green-600">{metrics.leverage.current}%</span>
                    <span className="ml-2 text-green-500">↑</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Required: {metrics.leverage.required}%</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  <p className="mt-1 text-xs text-gray-500">+{metrics.leverage.buffer}% buffer</p>
                </div>
              </div>
              
              <div className="h-2 rounded-full bg-gray-200 mb-3">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{
                    width: `${Math.min(100, (metrics.leverage.current / metrics.leverage.required) * 100)}%`,
                  }}
                />
              </div>
              
              {/* Regulatory Context */}
              <div className="bg-green-50 p-2 rounded text-xs">
                <p className="font-medium text-green-800">Regulatory Driver:</p>
                <p className="text-green-700">CRR Article 429 - Compliant</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Impact */}
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Regulatory Impact</p>
                  <div className="mt-2 flex items-center">
                    <span className="text-2xl font-bold text-purple-600">
                      {formatCurrency(metrics.totalImpact)}
                    </span>
                    <span className="ml-2 text-purple-500">⚠️</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Timeline: 9–12 months</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-purple-100 text-purple-800">{metrics.confidence}% Confidence</Badge>
                  <p className="mt-1 text-xs text-gray-500">AI Analysis</p>
                </div>
              </div>
              
              {/* Regulatory Context */}
              <div className="bg-purple-50 p-2 rounded text-xs">
                <p className="font-medium text-purple-800">Based on Analysis:</p>
                <p className="text-purple-700">{mockRegulatoryData.financialImpactClauses} financial impact clauses</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Critical Alerts - enhanced with your format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
              Critical Regulatory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRegulatoryData.criticalAlerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center flex-wrap gap-2">
                        <span className="font-semibold">{alert.title}</span>
                        <Badge className="bg-red-100 text-red-800">
                          {alert.probability}% probability
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {alert.confidence}% confidence
                        </Badge>
                      </div>
                      <p className="mb-2 text-sm">{alert.description}</p>
                      <p className="text-sm font-medium mb-2">{alert.impact}</p>
                      <p className="text-xs text-gray-600">
                        <strong>Regulatory Source:</strong> {alert.regulation}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <span className="mb-2 block rounded border bg-white px-2 py-1 text-xs">
                        {alert.timeline}
                      </span>
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Tabs with Regulatory Intelligence */}
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
                  {mockRegulatoryData.strategicRecommendations.map((rec) => (
                    <div key={rec.id} className="rounded-lg border p-4">
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
                    <Badge variant="secondary">{mockRegulatoryData.financialImpacts.capitalRequirements.count}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Confidence Score:</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={mockRegulatoryData.financialImpacts.capitalRequirements.avgConfidence * 100} className="w-20" />
                      <span className="text-sm text-gray-600">{Math.round(mockRegulatoryData.financialImpacts.capitalRequirements.avgConfidence * 100)}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700">Regulatory Changes:</h4>
                    {mockRegulatoryData.financialImpacts.capitalRequirements.keyChanges.map((change, idx) => (
                      <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{change.metric}</span>
                          <span className="text-xs text-gray-600">{change.current} → {change.proposed}</span>
                        </div>
                        <p className="text-xs text-gray-700 mb-1">{change.impact}</p>
                        <p className="text-xs font-medium text-blue-700">Source: {change.regulation}</p>
                        <p className="text-xs text-gray-500">Timeline: {change.daysUntil} days</p>
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
                    <Badge variant="secondary">{mockRegulatoryData.financialImpacts.liquidityRequirements.count}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Confidence Score:</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={mockRegulatoryData.financialImpacts.liquidityRequirements.avgConfidence * 100} className="w-20" />
                      <span className="text-sm text-gray-600">{Math.round(mockRegulatoryData.financialImpacts.liquidityRequirements.avgConfidence * 100)}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700">Regulatory Changes:</h4>
                    {mockRegulatoryData.financialImpacts.liquidityRequirements.keyChanges.map((change, idx) => (
                      <div key={idx} className="bg-green-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{change.metric}</span>
                          <span className="text-xs text-gray-600">{change.current} → {change.proposed}</span>
                        </div>
                        <p className="text-xs text-gray-700 mb-1">{change.impact}</p>
                        <p className="text-xs font-medium text-green-700">Source: {change.regulation}</p>
                        <p className="text-xs text-gray-500">Timeline: {change.daysUntil} days</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="compliance-tracking">
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Compliance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{mockRegulatoryData.totalRegulations}</div>
                    <div className="text-sm text-gray-600">Active Regulations</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{mockRegulatoryData.complianceScore}%</div>
                    <div className="text-sm text-gray-600">Compliance Score</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{mockRegulatoryData.financialImpactClauses}</div>
                    <div className="text-sm text-gray-600">Financial Impact Clauses</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Regulatory Analysis Summary</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Total Clauses Analyzed:</strong> {mockRegulatoryData.totalClauses} across {mockRegulatoryData.totalRegulations} regulations
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Financial Impact Identified:</strong> {mockRegulatoryData.financialImpactClauses} clauses requiring financial adjustments
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Last Updated:</strong> {new Date(mockRegulatoryData.lastUpdated).toLocaleString()}
                  </p>
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
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Basel 3.1 Implementation Stress</li>
                        <li>• ILAAP Enhanced Requirements</li>
                        <li>• Adverse Market Conditions</li>
                        <li>• Liquidity Crisis Scenario</li>
                      </ul>
                      <Button size="sm" className="mt-3">
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
                      <div className="text-xl font-bold text-blue-600">{mockRegulatoryData.financialImpactClauses}</div>
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

        {/* Bottom Action Bar - Enhanced */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Ready to dive deeper?</h3>
                <p className="text-blue-100">Run comprehensive stress tests or generate detailed compliance reports</p>
                <p className="text-xs text-blue-200 mt-1">
                  Based on {mockRegulatoryData.totalClauses} analyzed regulatory clauses with {metrics.confidence}% confidence
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

        {/* Footer - keeping your format with enhancements */}
        <div className="border-t pt-4 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center space-x-4">
            <span>Last updated: {new Date().toLocaleString()}</span>
            <span>•</span>
            <span>Based on live portfolio data and {mockRegulatoryData.totalRegulations} analyzed regulations</span>
            <span>•</span>
            <span>Powered by Reggio AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedExecutiveDashboard;
