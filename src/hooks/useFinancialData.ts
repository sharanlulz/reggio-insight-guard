// src/hooks/useFinancialData.ts
// Calibrated to match Dashboard: Base LCR ~108.2%, Tier 1 ~11.7%, with realistic scenario variation

import { useEffect, useState } from "react";
import {
  type PortfolioAsset,
  type FundingProfile,
  type RegulatoryParameters,
  type CapitalBase,
} from "@/lib/financial-modeling";
import {
  REGULATORY_SCENARIOS,
  type StressScenario,
} from "@/lib/stress-test-engine";

// -------------------- Calibrated static inputs (GBP) --------------------
// Portfolio: keep as before (Level 1 dominant + some Level 2, plus risk assets)

const portfolio0: PortfolioAsset[] = [
  // HQLA Level 1 (gilts / reserves)
  {
    id: "L1-GILTS",
    assetClass: "SOVEREIGN",
    market_value: 500_000_000,
    notional_value: 500_000_000,
    rating: "AAA",
    jurisdiction: "UK",
    basel_risk_weight: 0.0,
    liquidity_classification: "HQLA_L1",
  },
  // HQLA Level 2A (AA corporates)
  {
    id: "L2A-AA-CORP",
    assetClass: "CORPORATE",
    market_value: 80_000_000,
    notional_value: 80_000_000,
    rating: "AA",
    jurisdiction: "UK",
    sector: "Financial",
    basel_risk_weight: 0.20,
    liquidity_classification: "HQLA_L2A",
  },
  // HQLA Level 2B (small slice)
  {
    id: "L2B-ETF",
    assetClass: "OTHER",
    market_value: 30_000_000,
    notional_value: 30_000_000,
    rating: "A",
    jurisdiction: "UK",
    basel_risk_weight: 1.0,
    liquidity_classification: "HQLA_L2B",
  },
  // Non-HQLA corporates (BBB)
  {
    id: "BBB-CORP",
    assetClass: "CORPORATE",
    market_value: 400_000_000,
    notional_value: 400_000_000,
    rating: "BBB",
    jurisdiction: "UK",
    sector: "Manufacturing",
    basel_risk_weight: 1.0,
    liquidity_classification: "NON_HQLA",
  },
  // Property / loans (non-HQLA)
  {
    id: "PROPERTY",
    assetClass: "PROPERTY",
    market_value: 300_000_000,
    notional_value: 300_000_000,
    jurisdiction: "UK",
    sector: "Commercial",
    basel_risk_weight: 1.0,
    liquidity_classification: "NON_HQLA",
  },
];

// Funding tuned so base LCR ≈ 108.2% (see calc below)
const funding0: FundingProfile = {
  retail_deposits: 1_000_000_000,    // retail stable (5% baseline runoff)
  corporate_deposits: 600_000_000,   // operational corporate (25% baseline)
  wholesale_funding: 346_000_000,    // tuned so outflows ≈ 546m
  secured_funding: 100_000_000,
  stable_funding_ratio: 0.90,
  deposit_concentration: {
    "Major Corp A": 80_000_000,
    "Major Corp B": 60_000_000,
    "Fund X": 100_000_000,
  },
};

// Reg minima (Dashboard shows a higher “proposed” target, but statutory min is 100%)
const regs: RegulatoryParameters = {
  jurisdiction: "UK",
  applicable_date: "2025-01-01",
  lcr_requirement: 1.0,         // 100% statutory minimum
  nsfr_requirement: 1.0,
  tier1_minimum: 0.06,           // 6% statutory minimum
  total_capital_minimum: 0.08,   // 8%
  leverage_ratio_minimum: 0.03,  // 3%
  large_exposure_limit: 0.25,
  stress_test_scenarios: [],
};

// Capital tuned so Tier 1 ≈ 11.7% vs derived RWA
// With this book, derived RWA ≈ 746m (see helper). 0.117 * 746m ≈ 87.3m
const capitalBase0: CapitalBase = {
  tier1_capital: 87_300_000,   // ~11.7% Tier 1
  tier2_capital: 30_000_000,   // total ~15.7%
};

// -------------------- Helpers --------------------

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function clonePortfolio(ps: PortfolioAsset[]) {
  return ps.map((a) => ({ ...a }));
}

// Apply asset shocks by assetClass (e.g., CORPORATE: -0.25)
function applyAssetShocks(ps: PortfolioAsset[], shocks: Record<string, number> = {}) {
  const shocked = clonePortfolio(ps);
  shocked.forEach((a) => {
    const key = (a.assetClass || "").toUpperCase();
    const s = shocks[key];
    if (typeof s === "number") {
      a.market_value = Math.max(0, a.market_value * (1 + s));
    }
  });
  return shocked;
}

// Basel L2 caps (L2 ≤ 40% total HQLA; L2B ≤ 15% of total)
function computeHQLAWithBaselCaps(ps: PortfolioAsset[]) {
  const l1 = sum(ps.filter(a => a.liquidity_classification === "HQLA_L1").map(a => a.market_value));
  const l2aRaw = sum(ps.filter(a => a.liquidity_classification === "HQLA_L2A").map(a => a.market_value));
  const l2bRaw = sum(ps.filter(a => a.liquidity_classification === "HQLA_L2B").map(a => a.market_value));

  const l2a = 0.85 * l2aRaw;
  const l2b = 0.75 * l2bRaw;

  const preCapTotal = l1 + l2a + l2b;
  const l2bCap = 0.15 * preCapTotal;
  const l2bCapped = Math.min(l2b, l2bCap);

  let l2 = l2a + l2bCapped;
  const totalWithL2 = l1 + l2;
  const l2OverallCap = 0.4 * totalWithL2;
  if (l2 > l2OverallCap) l2 = l2OverallCap;

  return {
    level1: l1,
    level2a_after: l2a,
    level2b_after_capped: l2bCapped,
    hqla_capped: l1 + l2,
  };
}

// Base run-off rates before shock (demo assumptions)
const BASE_RATES = {
  RETAIL_DEPOSITS: 0.05,     // retail stable 5%
  CORPORATE_DEPOSITS: 0.25,  // operational corporate 25%
  WHOLESALE_FUNDING: 1.00,   // unsecured wholesale 100%
};

// Basel/CRR ceilings for run-off rates
const MAX_RUNOFF = {
  RETAIL_DEPOSITS: 0.10,     // ≤ 10%
  CORPORATE_DEPOSITS: 0.40,  // ≤ 40%
  WHOLESALE_FUNDING: 1.00,   // ≤ 100%
};

// funding_shocks are typically negative in scenarios (e.g., -0.50 means +50% stress).
// We only amplify upward (never below base), then cap at Basel ceilings.
function rateWithShock(baseRate: number, shock?: number, ceiling = 1.0) {
  if (!Number.isFinite(baseRate)) return 0;
  const mult = shock && shock < 0 ? 1 + Math.abs(shock) : 1;
  return Math.min(baseRate * mult, ceiling);
}

function computeOutflows(f: FundingProfile, fundingShocks: Record<string, number> = {}) {
  const rRetail = rateWithShock(BASE_RATES.RETAIL_DEPOSITS, fundingShocks.RETAIL_DEPOSITS, MAX_RUNOFF.RETAIL_DEPOSITS);
  const rCorp   = rateWithShock(BASE_RATES.CORPORATE_DEPOSITS, fundingShocks.CORPORATE_DEPOSITS, MAX_RUNOFF.CORPORATE_DEPOSITS);
  const rWhlsl  = rateWithShock(BASE_RATES.WHOLESALE_FUNDING, fundingShocks.WHOLESALE_FUNDING, MAX_RUNOFF.WHOLESALE_FUNDING);

  const retail = rRetail * (f.retail_deposits ?? 0);
  const corp   = rCorp   * (f.corporate_deposits ?? 0);
  const whlsl  = rWhlsl  * (f.wholesale_funding ?? 0);

  return { retail, corp, whlsl, total: retail + corp + whlsl, rates: { rRetail, rCorp, rWhlsl } };
}

// RWA and leverage exposure
function deriveRWA(ps: PortfolioAsset[]) {
  return sum(ps.map(a => (a.basel_risk_weight ?? 0) * (a.market_value ?? 0)));
}
function totalAssets(ps: PortfolioAsset[]) {
  return sum(ps.map(a => a.market_value ?? 0));
}

// Capital from shocked portfolio + simple loss absorption on non-HQLA
function computeCapitalFromPortfolio(ps: PortfolioAsset[], base: CapitalBase) {
  const rwa = Math.max(deriveRWA(ps), 1);
  const levExp = Math.max(totalAssets(ps), 1);

  // Simple stress: 10% of MTM losses on NON_HQLA reduce Tier 1
  const nonHqlaBefore = sum(portfolio0.filter(a => a.liquidity_classification === "NON_HQLA").map(a => a.market_value));
  const nonHqlaAfter  = sum(ps.filter(a => a.liquidity_classification === "NON_HQLA").map(a => a.market_value));
  const nonHqlaLoss   = Math.max(0, nonHqlaBefore - nonHqlaAfter);
  const tier1Loss     = 0.10 * nonHqlaLoss;

  const tier1 = Math.max(0, (base.tier1_capital ?? 0) - tier1Loss);
  const total = Math.max(0, tier1 + (base.tier2_capital ?? 0));

  const tier1_ratio = tier1 / rwa;
  const total_ratio = total / rwa;
  const leverage_ratio = tier1 / levExp;

  return {
    risk_weighted_assets: rwa,
    tier1_capital_ratio: tier1_ratio,
    total_capital_ratio: total_ratio,
    leverage_ratio,
    compliance_status: {
      tier1_compliant: tier1_ratio >= (regs.tier1_minimum ?? 0.06),
      total_compliant: total_ratio >= (regs.total_capital_minimum ?? 0.08),
      leverage_compliant: leverage_ratio >= (regs.leverage_ratio_minimum ?? 0.03),
    },
  };
}

// -------------------- Hook --------------------

export function useFinancialData() {
  const [loading, setLoading] = useState(true);
  const [lcrData, setLcrData] = useState<any>(null);
  const [capitalData, setCapitalData] = useState<any>(null);
  const [stressResults, setStressResults] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  async function calculateFinancials() {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 100));

      // Base (no-shock) — compute HQLA with caps and outflows
      const H0 = computeHQLAWithBaselCaps(portfolio0);
      // Outflows with *no* shocks:
      // retail 1,000m * 5% = 50m
      // corp   600m * 25%  = 150m
      // whlsl  346m * 100% = 346m
      // total ≈ 546m → LCR ≈ 590.5 / 546 ≈ 1.082 (108.2%)
      const O0 = computeOutflows(funding0, {});
      const LCR0 = H0.hqla_capped / Math.max(O0.total, 1);

      setLcrData({
        lcr_ratio: LCR0, // ~1.082
        requirement: regs.lcr_requirement, // 1.0
        hqla_value: H0.hqla_capped,        // ≈ 590.5m
        net_cash_outflows: O0.total,       // ≈ 546m
        compliance_status: LCR0 >= (regs.lcr_requirement ?? 1.0) ? "COMPLIANT" : "NON_COMPLIANT",
        buffer_or_deficit: H0.hqla_capped - O0.total * (regs.lcr_requirement ?? 1.0),
        breakdown: {
          level1_assets: H0.level1,
          level2a_after_haircut: H0.level2a_after,
          level2b_after_haircut_capped: H0.level2b_after_capped,
          retail_outflow_rate: O0.rates.rRetail,
          corporate_outflow_rate: O0.rates.rCorp,
          wholesale_outflow_rate: O0.rates.rWhlsl,
        },
      });

      // Base capital — compute from portfolio and tuned capital base
      const baseCap = computeCapitalFromPortfolio(portfolio0, capitalBase0);
      setCapitalData(baseCap); // Tier 1 ≈ 11.7%

      // Scenarios — recompute per-scenario LCR & Capital using shocks
      const results = REGULATORY_SCENARIOS.map((s: StressScenario) => {
        const shockedPortfolio = applyAssetShocks(portfolio0, s.asset_shocks || {});
        const H = computeHQLAWithBaselCaps(shockedPortfolio);
        const O = computeOutflows(funding0, s.funding_shocks || {});
        const lcr = H.hqla_capped / Math.max(O.total, 1);

        const cap = computeCapitalFromPortfolio(shockedPortfolio, capitalBase0);

        const passLcr = lcr >= (regs.lcr_requirement ?? 1.0);
        const passT1 = cap.tier1_capital_ratio >= (regs.tier1_minimum ?? 0.06);

        return {
          scenario_name: s.name,
          lcr_result: {
            lcr_ratio: lcr,
            requirement: regs.lcr_requirement ?? 1.0,
            compliance_status: passLcr ? "COMPLIANT" : "NON_COMPLIANT",
            hqla_value: H.hqla_capped,
            net_cash_outflows: O.total,
          },
          capital_result: cap,
          overall_assessment: {
            overall_severity: passLcr && passT1 ? "LOW" : "HIGH",
          },
          recommendations: [],
        };
      });

      setStressResults(results);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Financial calculation error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    calculateFinancials();
  }, []);

  const getKeyMetrics = () => {
    if (!lcrData || !capitalData) return null;

    const failed = stressResults.filter(
      (r) =>
        r?.lcr_result?.compliance_status === "NON_COMPLIANT" ||
        !r?.capital_result?.compliance_status?.tier1_compliant
    ).length;

    const worstLcr =
      stressResults.length > 0
        ? Math.min(...stressResults.map((r) => Number(r?.lcr_result?.lcr_ratio ?? Infinity)))
        : Number(lcrData?.lcr_ratio ?? 0);

    return {
      lcr: {
        ratio: Number(lcrData?.lcr_ratio ?? 0), // ~1.082
        status: lcrData?.compliance_status,
        buffer: Number(lcrData?.buffer_or_deficit ?? 0),
      },
      capital: {
        tier1_ratio: Number(capitalData?.tier1_capital_ratio ?? 0),  // ~0.117
        total_ratio: Number(capitalData?.total_capital_ratio ?? 0),  // ~0.157
        leverage_ratio: Number(capitalData?.leverage_ratio ?? 0),    // ~0.066
        risk_weighted_assets: Number(capitalData?.risk_weighted_assets ?? 0),
        compliance: capitalData?.compliance_status,
      },
      stress: {
        total_scenarios: stressResults.length,
        failed_scenarios: failed,
        worst_lcr: worstLcr,
      },
    };
  };

  return {
    loading,
    keyMetrics: getKeyMetrics(),
    lcrData,
    capitalData,
    stressResults,
    regulatoryAlerts: [],
    strategicRecommendations: [],
    lastUpdated,
    refresh: calculateFinancials,
  };
}
