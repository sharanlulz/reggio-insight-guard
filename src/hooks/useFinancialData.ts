// src/hooks/useFinancialData.ts
// Unified demo data + calculators (stable, realistic, consistent)

import { useState, useEffect } from "react";
import {
  LiquidityCoverageRatioCalculator,
  StressTestingEngine,
  type PortfolioAsset,
  type FundingProfile,
  type RegulatoryParameters,
  type CapitalBase,
} from "@/lib/financial-modeling";
import {
  REGULATORY_SCENARIOS,
  type StressScenario,
} from "@/lib/stress-test-engine";

// ---------- Realistic demo inputs (GBP) ----------
const samplePortfolio: PortfolioAsset[] = [
  // Level 1 HQLA (gilts)
  {
    id: "1",
    assetClass: "SOVEREIGN",
    market_value: 180_000_000,
    notional_value: 180_000_000,
    rating: "AAA",
    jurisdiction: "UK",
    basel_risk_weight: 0.0,
    liquidity_classification: "HQLA_L1",
  },
  // Level 2A HQLA (AA corporates)
  {
    id: "2",
    assetClass: "CORPORATE",
    market_value: 40_000_000,
    notional_value: 40_000_000,
    rating: "AA",
    jurisdiction: "UK",
    sector: "Financial",
    basel_risk_weight: 0.2,
    liquidity_classification: "HQLA_L2A",
  },
  // Level 2B (low-vol asset kept small)
  {
    id: "3",
    assetClass: "PROPERTY",
    market_value: 10_000_000,
    notional_value: 10_000_000,
    jurisdiction: "UK",
    sector: "Commercial",
    basel_risk_weight: 1.0,
    liquidity_classification: "HQLA_L2B",
  },
  // Non-HQLA risk assets (BBB corporates)
  {
    id: "4",
    assetClass: "CORPORATE",
    market_value: 120_000_000,
    notional_value: 120_000_000,
    rating: "BBB",
    jurisdiction: "UK",
    sector: "Manufacturing",
    basel_risk_weight: 1.0,
    liquidity_classification: "NON_HQLA",
  },
];

const sampleFunding: FundingProfile = {
  retail_deposits: 200_000_000,     // stable retail
  corporate_deposits: 100_000_000,  // operational corporate
  wholesale_funding: 50_000_000,    // short-term wholesale
  secured_funding: 25_000_000,      // repos etc.
  stable_funding_ratio: 0.85,
  deposit_concentration: {
    "Major Corp A": 20_000_000,
    "Major Corp B": 15_000_000,
    "Pension Fund X": 25_000_000,
  },
};

const ukRegulatoryParams: RegulatoryParameters = {
  jurisdiction: "UK",
  applicable_date: "2024-01-01",
  lcr_requirement: 1.05,        // ✅ 105% (was 1.00)
  nsfr_requirement: 1.0,
  tier1_minimum: 0.06,
  total_capital_minimum: 0.08,
  leverage_ratio_minimum: 0.03,
  large_exposure_limit: 0.25,
  stress_test_scenarios: [],
};

const currentCapital: CapitalBase = {
  tier1_capital: 60_000_000,
  tier2_capital: 15_000_000,
};

// Zero-shock scenario for base capital calc (keeps math consistent with engine)
const zeroShockScenario: StressScenario = {
  name: "Base (No Shock)",
  asset_shocks: {}, // no price shocks
  funding_shocks: {}, // no outflow shocks
  capital_base: currentCapital,
};

export function useFinancialData() {
  const [loading, setLoading] = useState(true);
  const [lcrData, setLcrData] = useState<any>(null);
  const [capitalData, setCapitalData] = useState<any>(null);
  const [stressResults, setStressResults] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  async function calculateFinancials() {
    setLoading(true);
    try {
      // Small artificial delay to mimic I/O
      await new Promise((r) => setTimeout(r, 300));

      // --- Base LCR (LiquidityCoverageRatioCalculator) ---
      const lcrCalc = new LiquidityCoverageRatioCalculator(
        samplePortfolio,
        sampleFunding,
        ukRegulatoryParams
      );
      const lcrResult = lcrCalc.calculateLCR();
      setLcrData(lcrResult);

      // --- Capital (via StressTestingEngine, zero-shock) ---
      const engine = new StressTestingEngine(
        samplePortfolio,
        sampleFunding,
        ukRegulatoryParams
      );
      const base = engine.runStressScenario(zeroShockScenario);
      // This returns { capital_result: { tier1_capital_ratio, total_capital_ratio, ... } }
      setCapitalData(base.capital_result);

      // --- Regulatory Scenarios (force your capital base for consistency) ---
      const regResults = REGULATORY_SCENARIOS.map((s) =>
        engine.runStressScenario({
          ...s,
          capital_base: currentCapital, // ✅ do not vary Tier 1 unexpectedly
        } as StressScenario)
      );
      setStressResults(regResults);

      setLastUpdated(new Date());
    } catch (e) {
      console.error("Financial calculation error:", e);
      // Keep state graceful; dashboard guards undefined
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    calculateFinancials();
  }, []);

  // --------- Helpers surfaced to the dashboard ---------
  const getKeyMetrics = () => {
    if (!lcrData || !capitalData) return null;

    const failed =
      stressResults.filter(
        (r) =>
          r?.lcr_result?.compliance_status === "NON_COMPLIANT" ||
          !r?.capital_result?.compliance_status?.tier1_compliant
      ).length ?? 0;

    const worstLcr =
      stressResults.length > 0
        ? Math.min(
            ...stressResults.map((r) => Number(r?.lcr_result?.lcr_ratio ?? Infinity))
          )
        : Number(lcrData?.lcr_ratio ?? 0);

    return {
      lcr: {
        ratio: Number(lcrData?.lcr_ratio ?? 0), // decimal (e.g., 1.62)
        status: lcrData?.compliance_status,
        buffer: Number(lcrData?.buffer_or_deficit ?? 0),
      },
      capital: {
        tier1_ratio: Number(capitalData?.tier1_capital_ratio ?? 0), // decimal
        total_ratio: Number(capitalData?.total_capital_ratio ?? 0), // decimal
        leverage_ratio: Number(capitalData?.leverage_ratio ?? 0),   // decimal
        rwa: Number(capitalData?.risk_weighted_assets ?? 0),
        compliance: capitalData?.compliance_status,
      },
      stress: {
        total_scenarios: stressResults.length,
        failed_scenarios: failed,
        worst_lcr: worstLcr, // decimal
      },
    };
  };

  const getRegulatoryAlerts = () => [
    {
      type: "warning",
      title: "PRA Liquidity Requirements",
      description: "Internal target set to 105% LCR buffer.",
      financial_impact: "Additional £25M HQLA suggested",
      annual_cost: 2_500_000,
      timeline_days: 120,
      current_position: lcrData ? `${(Number(lcrData.lcr_ratio) * 100).toFixed(0)}%` : "—",
    },
    {
      type: "info",
      title: "Basel III.1 Calibration",
      description: "Re-evaluate RWA treatment for BBB corporates.",
      financial_impact: "Potential +£10–15M Tier 1",
      annual_cost: 1_200_000,
      timeline_days: 180,
      current_position: capitalData
        ? `${(Number(capitalData.tier1_capital_ratio) * 100).toFixed(1)}% Tier 1`
        : "—",
    },
  ];

  const getStrategicRecommendations = () => {
    if (!lcrData || !capitalData) return [];

    const recs: any[] = [];

    // LCR buffer
    if (Number(lcrData.buffer_or_deficit ?? 0) < 50_000_000) {
      const gap = 50_000_000 - Number(lcrData.buffer_or_deficit ?? 0);
      if (gap > 0) {
        recs.push({
          priority: "high",
          action: `Add ~£${(gap / 1_000_000).toFixed(0)}M HQLA (gilts)`,
          rationale: "Strengthen buffer to internal target.",
          timeline: "60 days",
        });
      }
    }

    // Tier 1 headroom vs 6%
    const rwa = Number(capitalData.risk_weighted_assets ?? 0);
    const t1 = Number(capitalData.tier1_capital_ratio ?? 0);
    const shortfall = Math.max(0, 0.06 * rwa - t1 * rwa);
    if (shortfall > 0) {
      recs.push({
        priority: "high",
        action: `Consider £${(shortfall / 1_000_000).toFixed(0)}M AT1 issuance`,
        rationale: "Close Tier 1 gap to 6% minimum.",
        timeline: "90 days",
      });
    }

    if (recs.length === 0) {
      recs.push({
        priority: "low",
        action: "Maintain current buffers; monitor wholesale markets",
        rationale: "All thresholds met under base case.",
        timeline: "Ongoing",
      });
    }

    return recs;
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
    refresh: calculateFinancials,
  };
}