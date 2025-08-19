import React, { useState, useEffect } from ‘react’;
import { Card, CardHeader, CardTitle, CardContent } from ‘@/components/ui/card’;
import { Button } from ‘@/components/ui/button’;
import { Badge } from ‘@/components/ui/badge’;
import { Alert, AlertDescription } from ‘@/components/ui/alert’;
import { Progress } from ‘@/components/ui/progress’;
import {
TrendingUp,
TrendingDown,
AlertTriangle,
CheckCircle,
Clock,
DollarSign,
BarChart3,
FileText,
Users,
Shield,
Target,
Zap
} from ‘lucide-react’;
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from ‘recharts’;

// Enhanced Phase 2 Executive Dashboard
const EnhancedExecutiveDashboard = () => {
const [timeframe, setTimeframe] = useState(‘current’);
const [loading, setLoading] = useState(false);

// Simulated real financial data - in production this comes from your financial modeling engine
const financialMetrics = {
lcr: { current: 108, required: 110, buffer: -2, trend: -2.3 },
tier1: { current: 11.8, required: 12.0, buffer: -0.2, trend: -0.5 },
leverage: { current: 3.2, required: 3.0, buffer: 0.2, trend: 0.1 },
totalAssets: 15_600_000_000,
rwa: 8_200_000_000
};

const regulatoryImpact = {
totalCost: 127_500_000,
capitalRequired: 85_000_000,
liquidityRequired: 42_500_000,
implementationTimeline: ‘9-12 months’,
confidenceLevel: 87
};

const stressTestResults = [
{ scenario: ‘Base Case’, lcr: 108, tier1: 11.8, status: ‘pass’ },
{ scenario: ‘Mild Stress’, lcr: 102, tier1: 11.2, status: ‘pass’ },
{ scenario: ‘Severe Stress’, lcr: 95, tier1: 10.1, status: ‘fail’ },
{ scenario: ‘Extreme Stress’, lcr: 87, tier1: 9.3, status: ‘fail’ }
];

const regulatoryAlerts = [
{
id: 1,
priority: ‘critical’,
title: ‘LCR Breach Risk’,
description: ‘Current trajectory shows potential LCR breach in Q3 2024’,
impact: ‘£52M additional liquidity required’,
timeline: ‘90 days’,
probability: 78,
actions: [‘Increase HQLA allocation’, ‘Review deposit composition’, ‘Optimize funding mix’]
},
{
id: 2,
priority: ‘high’,
title: ‘Basel IV Implementation’,
description: ‘Final calibration increases RWA by estimated 12%’,
impact: ‘£67M additional Tier 1 capital’,
timeline: ‘365 days’,
probability: 95,
actions: [‘Capital raising strategy’, ‘Asset optimization’, ‘Business model review’]
},
{
id: 3,
priority: ‘medium’,
title: ‘MREL Optimization’,
description: ‘Recent debt issuance creates optimization opportunity’,
impact: ‘£8M annual savings potential’,
timeline: ‘30 days’,
probability: 85,
actions: [‘Subordination analysis’, ‘Liability restructuring’, ‘Cost optimization’]
}
];

const strategicRecommendations = [
{
id: 1,
priority: ‘high’,
action: ‘Immediate HQLA Rebalancing’,
rationale: ‘Current liquid asset composition insufficient for stress scenarios’,
financialImpact: 52_000_000,
timeline: ‘60 days’,
probability: 92,
owner: ‘Treasury’,
status: ‘pending’,
keySteps: [
‘Analyze current HQLA composition’,
‘Identify optimal rebalancing strategy’,
‘Execute £52M HQLA increase’,
‘Monitor daily LCR metrics’
]
},
{
id: 2,
priority: ‘high’,
action: ‘Capital Planning Strategy’,
rationale: ‘Basel IV implementation requires proactive capital management’,
financialImpact: 67_000_000,
timeline: ‘120 days’,
probability: 88,
owner: ‘CFO’,
status: ‘in-progress’,
keySteps: [
‘Finalize Basel IV impact assessment’,
‘Develop capital raising options’,
‘Board approval for strategy’,
‘Execute capital optimization’
]
},
{
id: 3,
priority: ‘medium’,
action: ‘MREL Structure Optimization’,
rationale: ‘Recent subordinated debt issuance enables cost optimization’,
financialImpact: -8_000_000, // Negative = savings
timeline: ‘30 days’,
probability: 95,
owner: ‘Treasury’,
status: ‘ready’,
keySteps: [
‘Complete subordination analysis’,
‘Model liability restructuring’,
‘Implement optimization’,
‘Monitor ongoing compliance’
]
}
];

const formatCurrency = (amount) => {
const absAmount = Math.abs(amount);
if (absAmount >= 1_000_000) {
return `£${(absAmount / 1_000_000).toFixed(1)}M`;
}
return `£${(absAmount / 1_000).toFixed(0)}K`;
};

const getPriorityColor = (priority) => {
switch (priority) {
case ‘critical’: return ‘bg-red-50 border-red-200 text-red-800’;
case ‘high’: return ‘bg-orange-50 border-orange-200 text-orange-800’;
case ‘medium’: return ‘bg-yellow-50 border-yellow-200 text-yellow-800’;
default: return ‘bg-blue-50 border-blue-200 text-blue-800’;
}
};

const getStatusIcon = (status) => {
switch (status) {
case ‘pass’: return <CheckCircle className="h-4 w-4 text-green-600" />;
case ‘fail’: return <AlertTriangle className="h-4 w-4 text-red-600" />;
default: return <Clock className="h-4 w-4 text-yellow-600" />;
}
};

// Historical trend data for charts
const lcrTrend = [
{ month: ‘Jan’, lcr: 112, required: 110 },
{ month: ‘Feb’, lcr: 111, required: 110 },
{ month: ‘Mar’, lcr: 109, required: 110 },
{ month: ‘Apr’, lcr: 108, required: 110 },
{ month: ‘May’, lcr: 107, required: 110 },
{ month: ‘Jun’, lcr: 108, required: 110 }
];

const impactDistribution = [
{ name: ‘Capital Impact’, value: 67, color: ‘#ef4444’ },
{ name: ‘Liquidity Impact’, value: 33, color: ‘#f97316’ },
{ name: ‘Operational Impact’, value: 15, color: ‘#eab308’ },
{ name: ‘Savings Potential’, value: -8, color: ‘#22c55e’ }
];

return (
<div className="p-6 space-y-6 bg-gray-50 min-h-screen">
{/* Header */}
<div className="flex items-center justify-between">
<div>
<h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
<p className="text-gray-600 mt-1">Real-time regulatory intelligence and financial impact analysis</p>
</div>
<div className="flex items-center gap-3">
<Button variant=“outline” onClick={() => setLoading(true)} disabled={loading}>
<BarChart3 className="h-4 w-4 mr-2" />
{loading ? ‘Calculating…’ : ‘Refresh Analytics’}
</Button>
<Button>
<FileText className="h-4 w-4 mr-2" />
Export Report
</Button>
</div>
</div>

```
  {/* Key Metrics Overview */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Liquidity Coverage Ratio</p>
            <div className="flex items-center mt-2">
              <span className="text-2xl font-bold text-red-600">{financialMetrics.lcr.current}%</span>
              <TrendingDown className="h-4 w-4 text-red-500 ml-2" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Required: {financialMetrics.lcr.required}%</p>
          </div>
          <div className="text-right">
            <Badge variant="destructive">Below Target</Badge>
            <p className="text-xs text-gray-500 mt-1">{financialMetrics.lcr.buffer}% buffer</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Tier 1 Capital Ratio</p>
            <div className="flex items-center mt-2">
              <span className="text-2xl font-bold text-orange-600">{financialMetrics.tier1.current}%</span>
              <TrendingDown className="h-4 w-4 text-orange-500 ml-2" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Required: {financialMetrics.tier1.required}%</p>
          </div>
          <div className="text-right">
            <Badge variant="secondary">At Risk</Badge>
            <p className="text-xs text-gray-500 mt-1">{financialMetrics.tier1.buffer}% buffer</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Leverage Ratio</p>
            <div className="flex items-center mt-2">
              <span className="text-2xl font-bold text-green-600">{financialMetrics.leverage.current}%</span>
              <TrendingUp className="h-4 w-4 text-green-500 ml-2" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Required: {financialMetrics.leverage.required}%</p>
          </div>
          <div className="text-right">
            <Badge variant="default" className="bg-green-100 text-green-800">Compliant</Badge>
            <p className="text-xs text-gray-500 mt-1">+{financialMetrics.leverage.buffer}% buffer</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Regulatory Impact</p>
            <div className="flex items-center mt-2">
              <span className="text-2xl font-bold text-purple-600">{formatCurrency(regulatoryImpact.totalCost)}</span>
              <AlertTriangle className="h-4 w-4 text-purple-500 ml-2" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Timeline: {regulatoryImpact.implementationTimeline}</p>
          </div>
          <div className="text-right">
            <Badge variant="outline">{regulatoryImpact.confidenceLevel}% Confidence</Badge>
            <p className="text-xs text-gray-500 mt-1">AI Analysis</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Charts Row */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* LCR Trend Chart */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingDown className="h-5 w-5 mr-2 text-blue-600" />
          LCR Trend Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lcrTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[105, 115]} />
            <Tooltip />
            <Line type="monotone" dataKey="lcr" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="required" stroke="#ef4444" strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-2">Red line indicates regulatory minimum requirement</p>
      </CardContent>
    </Card>

    {/* Stress Test Results */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2 text-green-600" />
          Stress Test Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stressTestResults.map((result, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {getStatusIcon(result.status)}
                <span className="ml-2 font-medium">{result.scenario}</span>
              </div>
              <div className="text-right">
                <div className="text-sm">LCR: {result.lcr}% | T1: {result.tier1}%</div>
                <div className={`text-xs ${result.status === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                  {result.status === 'pass' ? 'PASS' : 'FAIL'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Critical Alerts */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
        Critical Regulatory Alerts
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {regulatoryAlerts.map((alert) => (
          <Alert key={alert.id} className={getPriorityColor(alert.priority)}>
            <AlertDescription>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="font-semibold">{alert.title}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {alert.probability}% probability
                    </Badge>
                  </div>
                  <p className="text-sm mb-2">{alert.description}</p>
                  <p className="text-sm font-medium">{alert.impact}</p>
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Key Actions:</p>
                    <ul className="text-xs space-y-1">
                      {alert.actions.map((action, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <Badge variant="outline" className="mb-2">
                    {alert.timeline}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </CardContent>
  </Card>

  {/* Strategic Recommendations */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <Target className="h-5 w-5 mr-2 text-purple-600" />
        AI-Generated Strategic Recommendations
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        {strategicRecommendations.map((rec) => (
          <div key={rec.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="font-semibold text-lg">{rec.action}</span>
                  <Badge 
                    variant={rec.priority === 'high' ? 'destructive' : 'secondary'} 
                    className="ml-2"
                  >
                    {rec.priority} priority
                  </Badge>
                  <Badge variant="outline" className="ml-2">
                    {rec.probability}% confidence
                  </Badge>
                </div>
                <p className="text-gray-600 mb-3">{rec.rationale}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Financial Impact</p>
                    <p className={`font-semibold ${rec.financialImpact < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rec.financialImpact < 0 ? 'Save ' : 'Cost '}
                      {formatCurrency(rec.financialImpact)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Timeline</p>
                    <p className="font-semibold">{rec.timeline}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Owner</p>
                    <p className="font-semibold">{rec.owner}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Implementation Steps:</p>
                  <div className="space-y-2">
                    {rec.keySteps.map((step, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mr-3">
                          {index + 1}
                        </div>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="ml-4 text-right">
                <Badge 
                  variant={rec.status === 'ready' ? 'default' : 'secondary'}
                  className="mb-3 block"
                >
                  {rec.status}
                </Badge>
                <div className="space-y-2">
                  <Button size="sm" variant="outline" className="block w-full">
                    View Details
                  </Button>
                  <Button size="sm" className="block w-full">
                    Implement
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>

  {/* Footer with Real-time Updates */}
  <div className="text-center text-sm text-gray-500 border-t pt-4">
    <div className="flex items-center justify-center space-x-4">
      <span>Last updated: {new Date().toLocaleString()}</span>
      <span>•</span>
      <span>Based on live portfolio data and regulatory analysis</span>
      <span>•</span>
      <span className="flex items-center">
        <Zap className="h-3 w-3 mr-1" />
        Powered by Reggio AI
      </span>
    </div>
  </div>
</div>
```

);
};

export default EnhancedExecutiveDashboard;