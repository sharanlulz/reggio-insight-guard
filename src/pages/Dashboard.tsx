import React, { useState } from ‘react’;

const EnhancedExecutiveDashboard = () => {
const [loading, setLoading] = useState(false);

// Financial metrics data
const metrics = {
lcr: { current: 108.2, required: 110, buffer: -1.8 },
tier1: { current: 11.7, required: 12.0, buffer: -0.3 },
leverage: { current: 3.15, required: 3.0, buffer: 0.15 },
totalImpact: 127_500_000,
confidence: 87
};

const formatCurrency = (amount) => {
if (amount >= 1_000_000) return `£${(amount / 1_000_000).toFixed(1)}M`;
if (amount >= 1_000) return `£${(amount / 1_000).toFixed(0)}K`;
return `£${amount.toFixed(0)}`;
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
<button
className=“px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 flex items-center”
onClick={() => setLoading(!loading)}
disabled={loading}
>
<span className="mr-2">📊</span>
{loading ? ‘Calculating…’ : ‘Refresh Analytics’}
</button>
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
<span className="mr-2">📄</span>
Export Report
</button>
</div>
</div>

```
  {/* Live Status Banner */}
  <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <span className="text-blue-600 mr-2">⚡</span>
        <span>
          <strong>Live Analysis Active:</strong> Connected to portfolio data and regulatory feeds
        </span>
      </div>
      <div className="text-sm text-blue-600">
        Last updated: {new Date().toLocaleTimeString()} • Confidence: {metrics.confidence}%
      </div>
    </div>
  </div>

  {/* Key Metrics Grid */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Liquidity Coverage Ratio</p>
          <div className="flex items-center mt-2">
            <span className="text-2xl font-bold text-red-600">{metrics.lcr.current}%</span>
            <span className="text-red-500 ml-2">↓</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Required: {metrics.lcr.required}%</p>
        </div>
        <div className="text-right">
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Below Target</span>
          <p className="text-xs text-gray-500 mt-1">{metrics.lcr.buffer}% buffer</p>
        </div>
      </div>
      <div className="mt-4 bg-gray-200 rounded-full h-2">
        <div 
          className="bg-red-500 h-2 rounded-full" 
          style={{ width: `${Math.max(0, (metrics.lcr.current / metrics.lcr.required) * 100)}%` }}
        ></div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Tier 1 Capital Ratio</p>
          <div className="flex items-center mt-2">
            <span className="text-2xl font-bold text-orange-600">{metrics.tier1.current}%</span>
            <span className="text-orange-500 ml-2">↓</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Required: {metrics.tier1.required}%</p>
        </div>
        <div className="text-right">
          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">At Risk</span>
          <p className="text-xs text-gray-500 mt-1">{metrics.tier1.buffer}% buffer</p>
        </div>
      </div>
      <div className="mt-4 bg-gray-200 rounded-full h-2">
        <div 
          className="bg-orange-500 h-2 rounded-full" 
          style={{ width: `${Math.max(0, (metrics.tier1.current / metrics.tier1.required) * 100)}%` }}
        ></div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Leverage Ratio</p>
          <div className="flex items-center mt-2">
            <span className="text-2xl font-bold text-green-600">{metrics.leverage.current}%</span>
            <span className="text-green-500 ml-2">↑</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Required: {metrics.leverage.required}%</p>
        </div>
        <div className="text-right">
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Compliant</span>
          <p className="text-xs text-gray-500 mt-1">+{metrics.leverage.buffer}% buffer</p>
        </div>
      </div>
      <div className="mt-4 bg-gray-200 rounded-full h-2">
        <div 
          className="bg-green-500 h-2 rounded-full" 
          style={{ width: `${Math.min(100, (metrics.leverage.current / metrics.leverage.required) * 100)}%` }}
        ></div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Total Regulatory Impact</p>
          <div className="flex items-center mt-2">
            <span className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.totalImpact)}</span>
            <span className="text-purple-500 ml-2">⚠️</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Timeline: 9-12 months</p>
        </div>
        <div className="text-right">
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">{metrics.confidence}% Confidence</span>
          <p className="text-xs text-gray-500 mt-1">AI Analysis</p>
        </div>
      </div>
    </div>
  </div>

  {/* Critical Alerts */}
  <div className="bg-white p-6 rounded-lg shadow border">
    <div className="flex items-center mb-4">
      <span className="text-red-600 mr-2">🚨</span>
      <h3 className="text-lg font-semibold">Critical Regulatory Alerts</h3>
    </div>
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <span className="font-semibold">LCR Breach Risk</span>
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">78% probability</span>
            </div>
            <p className="text-sm mb-2">Current trajectory shows potential LCR breach in Q3 2024</p>
            <p className="text-sm font-medium">£52M additional liquidity required</p>
          </div>
          <div className="text-right ml-4">
            <span className="px-2 py-1 bg-white border text-xs rounded block mb-2">90 days</span>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
              Review
            </button>
          </div>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <span className="font-semibold">Basel IV Implementation</span>
              <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">95% probability</span>
            </div>
            <p className="text-sm mb-2">Final calibration increases RWA by estimated 12%</p>
            <p className="text-sm font-medium">£67M additional Tier 1 capital</p>
          </div>
          <div className="text-right ml-4">
            <span className="px-2 py-1 bg-white border text-xs rounded block mb-2">365 days</span>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
              Review
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* Strategic Recommendations */}
  <div className="bg-white p-6 rounded-lg shadow border">
    <div className="flex items-center mb-4">
      <span className="text-purple-600 mr-2">🎯</span>
      <h3 className="text-lg font-semibold">AI-Generated Strategic Recommendations</h3>
    </div>
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <span className="font-semibold text-lg">Immediate HQLA Rebalancing</span>
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">high priority</span>
              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">92% confidence</span>
            </div>
            <p className="text-gray-600 mb-3">Current liquid asset composition insufficient for stress scenarios</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Financial Impact</p>
                <p className="font-semibold text-red-600">Cost £1.3M</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Timeline</p>
                <p className="font-semibold">60 days</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">pending</span>
              </div>
            </div>
          </div>
          
          <div className="ml-4 space-y-2">
            <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 block w-full">
              View Details
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 block w-full">
              Implement
            </button>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <span className="font-semibold text-lg">Strategic Capital Planning</span>
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">high priority</span>
              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">88% confidence</span>
            </div>
            <p className="text-gray-600 mb-3">Basel IV implementation requires proactive capital management</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Financial Impact</p>
                <p className="font-semibold text-red-600">Cost £8.0M</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Timeline</p>
                <p className="font-semibold">120 days</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">in-progress</span>
              </div>
            </div>
          </div>
          
          <div className="ml-4 space-y-2">
            <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 block w-full">
              View Details
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 block w-full">
              Implement
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

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