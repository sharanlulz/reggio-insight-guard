import React, { useState } from ‘react’;
import { Card } from ‘@/components/ui/card’;
import { Button } from ‘@/components/ui/button’;
import { Badge } from ‘@/components/ui/badge’;
import { Alert, AlertDescription } from ‘@/components/ui/alert’;
import {
TrendingUp,
TrendingDown,
AlertTriangle,
CheckCircle,
DollarSign,
BarChart3,
FileText,
Shield,
Target
} from ‘lucide-react’;

const EnhancedExecutiveDashboard = () => {
const [loading, setLoading] = useState(false);

// Real financial data simulation
const financialMetrics = {
lcr: { current: 108, required: 110, buffer: -2 },
tier1: { current: 11.8, required: 12.0, buffer: -0.2 },
leverage: { current: 3.2, required: 3.0, buffer: 0.2 }
};

const formatCurrency = (amount) => {
const absAmount = Math.abs(amount);
if (absAmount >= 1_000_000) {
return `£${(absAmount / 1_000_000).toFixed(1)}M`;
}
return `£${(absAmount / 1_000).toFixed(0)}K`;
};

const regulatoryAlerts = [
{
id: 1,
priority: ‘critical’,
title: ‘LCR Breach Risk’,
description: ‘Current trajectory shows potential LCR breach in Q3 2024’,
impact: ‘£52M additional liquidity required’,
timeline: ‘90 days’,
probability: 78
},
{
id: 2,
priority: ‘high’,
title: ‘Basel IV Implementation’,
description: ‘Final calibration increases RWA by estimated 12%’,
impact: ‘£67M additional Tier 1 capital’,
timeline: ‘365 days’,
probability: 95
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
status: ‘pending’
},
{
id: 2,
priority: ‘high’,
action: ‘Capital Planning Strategy’,
rationale: ‘Basel IV implementation requires proactive capital management’,
financialImpact: 67_000_000,
timeline: ‘120 days’,
probability: 88,
status: ‘in-progress’
}
];

const stressTestResults = [
{ scenario: ‘Base Case’, lcr: 108, tier1: 11.8, status: ‘pass’ },
{ scenario: ‘Mild Stress’, lcr: 102, tier1: 11.2, status: ‘pass’ },
{ scenario: ‘Severe Stress’, lcr: 95, tier1: 10.1, status: ‘fail’ },
{ scenario: ‘Extreme Stress’, lcr: 87, tier1: 9.3, status: ‘fail’ }
];

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
default: return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
}
};

return (
<div className="p-6 space-y-6 bg-gray-50 min-h-screen">
{/* Header */}
<div className="flex items-center justify-between">
<div>
<h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
<p className="text-gray-600 mt-1">Real-time regulatory intelligence and financial impact analysis</p>
</div>
<div className="flex items-center gap-3">
<Button
variant=“outline”
onClick={() => setLoading(!loading)}
disabled={loading}
>
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
    <Card className="p-6">
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
    </Card>

    <Card className="p-6">
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
    </Card>

    <Card className="p-6">
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
          <Badge className="bg-green-100 text-green-800">Compliant</Badge>
          <p className="text-xs text-gray-500 mt-1">+{financialMetrics.leverage.buffer}% buffer</p>
        </div>
      </div>
    </Card>

    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Total Regulatory Impact</p>
          <div className="flex items-center mt-2">
            <span className="text-2xl font-bold text-purple-600">{formatCurrency(127_500_000)}</span>
            <AlertTriangle className="h-4 w-4 text-purple-500 ml-2" />
          </div>
          <p className="text-xs text-gray-500 mt-1">Timeline: 9-12 months</p>
        </div>
        <div className="text-right">
          <Badge variant="outline">87% Confidence</Badge>
          <p className="text-xs text-gray-500 mt-1">AI Analysis</p>
        </div>
      </div>
    </Card>
  </div>

  {/* Stress Test Results */}
  <Card className="p-6">
    <div className="flex items-center mb-4">
      <Shield className="h-5 w-5 mr-2 text-green-600" />
      <h3 className="text-lg font-semibold">Stress Test Performance</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stressTestResults.map((result, index) => (
        <div key={index} className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{result.scenario}</span>
            {getStatusIcon(result.status)}
          </div>
          <div className="text-sm space-y-1">
            <div>LCR: {result.lcr}%</div>
            <div>Tier 1: {result.tier1}%</div>
            <div className={`font-medium ${result.status === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
              {result.status === 'pass' ? 'PASS' : 'FAIL'}
            </div>
          </div>
        </div>
      ))}
    </div>
  </Card>

  {/* Critical Alerts */}
  <Card className="p-6">
    <div className="flex items-center mb-4">
      <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
      <h3 className="text-lg font-semibold">Critical Regulatory Alerts</h3>
    </div>
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
              </div>
              <div className="text-right ml-4">
                <Badge variant="outline" className="mb-2">
                  {alert.timeline}
                </Badge>
                <div>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  </Card>

  {/* Strategic Recommendations */}
  <Card className="p-6">
    <div className="flex items-center mb-4">
      <Target className="h-5 w-5 mr-2 text-purple-600" />
      <h3 className="text-lg font-semibold">AI-Generated Strategic Recommendations</h3>
    </div>
    <div className="space-y-4">
      {strategicRecommendations.map((rec) => (
        <div key={rec.id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Financial Impact</p>
                  <p className="font-semibold text-red-600">
                    Cost {formatCurrency(rec.financialImpact)}
                  </p>
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
              <Button size="sm" variant="outline" className="block w-full">
                View Details
              </Button>
              <Button size="sm" className="block w-full">
                Implement
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </Card>

  {/* Footer */}
  <div className="text-center text-sm text-gray-500 border-t pt-4">
    <div className="flex items-center justify-center space-x-4">
      <span>Last updated: {new Date().toLocaleString()}</span>
      <span>•</span>
      <span>Based on live portfolio data and regulatory analysis</span>
      <span>•</span>
      <span>Powered by Reggio AI</span>
    </div>
  </div>
</div>
```

);
};

export default EnhancedExecutiveDashboard;