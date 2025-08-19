import React, { useState } from "react";

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

const EnhancedExecutiveDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // Example financial metrics (static for now; wire to API later)
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

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Real-time regulatory intelligence and financial impact analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setLoading((s) => !s)}
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
              <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">
                At Risk
              </span>
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
              <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                Compliant
              </span>
              <p className="mt-1 text-xs text-gray-500">+{metrics.leverage.buffer}% buffer</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{
                width: `${Math.min(
                  100,
                  (metrics.leverage.current / metrics.leverage.required) * 100
                )}%`,
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
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center">
                  <span className="font-semibold">LCR Breach Risk</span>
                  <span className="ml-2 rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                    78% probability
                  </span>
                </div>
                <p className="mb-2 text-sm">Current trajectory shows potential LCR breach in Q3 2024</p>
                <p className="text-sm font-medium">£52M additional liquidity required</p>
              </div>
              <div className="ml-4 text-right">
                <span className="mb-2 block rounded border bg-white px-2 py-1 text-xs">90 days</span>
                <button className="rounded border px-3 py-1 text-sm hover:bg-gray-50">Review</button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center">
                  <span className="font-semibold">Basel IV Implementation</span>
                  <span className="ml-2 rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">
                    95% probability
                  </span>
                </div>
                <p className="mb-2 text-sm">Final calibration increases RWA by estimated 12%</p>
                <p className="text-sm font-medium">£67M additional Tier 1 capital</p>
              </div>
              <div className="ml-4 text-right">
                <span className="mb-2 block rounded border bg-white px-2 py-1 text-xs">365 days</span>
                <button className="rounded border px-3 py-1 text-sm hover:bg-gray-50">Review</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Recommendations */}
      <div className="rounded-lg border bg-white p-6 shadow">
        <div className="mb-4 flex items-center">
          <span className="mr-2 text-purple-600">🎯</span>
          <h3 className="text-lg font-semibold">AI-Generated Strategic Recommendations</h3>
        </div>

        <div className="space-y-4">
          {/* Recommendation 1 */}
          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center">
                  <span className="text-lg font-semibold">Immediate HQLA Rebalancing</span>
                  <span className="ml-2 rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                    high priority
                  </span>
                  <span className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-800">
                    92% confidence
                  </span>
                </div>
                <p className="mb-3 text-gray-600">
                  Current liquid asset composition insufficient for stress scenarios
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800">pending</span>
                  </div>
                </div>
              </div>

              <div className="ml-4 space-y-2">
                <button className="block w-full rounded border px-3 py-1 text-sm hover:bg-gray-50">
                  View Details
                </button>
                <button className="block w-full rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
                  Implement
                </button>
              </div>
            </div>
          </div>

          {/* Recommendation 2 */}
          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center">
                  <span className="text-lg font-semibold">Strategic Capital Planning</span>
                  <span className="ml-2 rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                    high priority
                  </span>
                  <span className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-800">
                    88% confidence
                  </span>
                </div>
                <p className="mb-3 text-gray-600">
                  Basel IV implementation requires proactive capital management
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                      in-progress
                    </span>
                  </div>
                </div>
              </div>

              <div className="ml-4 space-y-2">
                <button className="block w-full rounded border px-3 py-1 text-sm hover:bg-gray-50">
                  View Details
                </button>
                <button className="block w-full rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
                  Implement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-4 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center space-x-4">
          <span>Last updated: {new Date().toLocaleString()}</span>
          <span>•</span>
          <span>Based on live portfolio data and regulatory analysis</span>
          <span>•</span>
          <span>Powered by Reggio AI</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedExecutiveDashboard;