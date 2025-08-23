// COMPLETE Production-Ready Enhanced useFinancialData Hook
// File: src/hooks/useFinancialData.ts
// REPLACE your entire existing useFinancialData.ts with this complete version

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
import { reggioMonitor } from "@/lib/reggio-monitoring";

// ================== COMPLETE PRESERVED EXISTING DATA ==================
// All your existing portfolio, funding, and regulatory data unchanged

const portfolio0: PortfolioAsset[] = [
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

const funding0: FundingProfile = {
  retail_deposits: 1_000_000_000,
  corporate_deposits: 600_000_000,
  wholesale_funding: 346_000_000,
  secured_funding: 100_000_000,
  stable_funding_ratio: 0.90,
  deposit_concentration: {
    "Major Corp A": 80_000_000,
    "Major Corp B": 60_000_000,
    "Fund X": 100_000_000,
  },
};

const regs: RegulatoryParameters = {
  jurisdiction: "UK",
  applicable_date: "2025-01-01",
  lcr_requirement: 1.0,
  nsfr_requirement: 1.0,
  tier1_minimum: 0.06,
  total_capital_minimum: 0.08,
  leverage_ratio_minimum: 0.03,
  large_exposure_limit: 0.25,
  stress_test_scenarios: [],
};

const capitalBase0: CapitalBase = {
  tier1_capital: 87_300_000,
  tier2_capital: 30_000_000,
};

// ================== COMPLETE PRESERVED HELPER FUNCTIONS ==================
// All your existing helper functions unchanged

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function clonePortfolio(ps: PortfolioAsset[]) {
  return ps.map((a) => ({ ...a }));
}

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

const BASE_RATES = {
  RETAIL_DEPOSITS: 0.05,
  CORPORATE_DEPOSITS: 0.25,
  WHOLESALE_FUNDING: 1.00,
};

const MAX_RUNOFF = {
  RETAIL_DEPOSITS: 0.10,
  CORPORATE_DEPOSITS: 0.40,
  WHOLESALE_FUNDING: 1.00,
};

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

function deriveRWA(ps: PortfolioAsset[]) {
  return sum(ps.map(a => (a.basel_risk_weight ?? 0) * (a.market_value ?? 0)));
}

function totalAssets(ps: PortfolioAsset[]) {
  return sum(ps.map(a => a.market_value ?? 0));
}

function computeCapitalFromPortfolio(ps: PortfolioAsset[], base: CapitalBase) {
  const rwa = Math.max(deriveRWA(ps), 1);
  const levExp = Math.max(totalAssets(ps), 1);

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

// ================== ENHANCED HOOK WITH MONITORING ==================
// This preserves ALL existing functionality and adds monitoring + improvements

interface UseFinancialDataReturn {
  loading: boolean;
  keyMetrics: any;
  lcrData: any;
  capitalData: any;
  stressResults: any[];
  regulatoryAlerts: any[];
  strategicRecommendations: any[];
  lastUpdated: Date;
  refresh: () => Promise<void>;
  // New enhanced properties (optional - won't break existing code)
  healthStatus?: 'healthy' | 'degraded' | 'error';
  performanceMetrics?: {
    avgLoadTime: number;
    errorRate: number;
  };
}

export function useFinancialData(): UseFinancialDataReturn {
  // ======== PRESERVED EXISTING STATE ========
  const [loading, setLoading] = useState(true);
  const [lcrData, setLcrData] = useState<any>(null);
  const [capitalData, setCapitalData] = useState<any>(null);
  const [stressResults, setStressResults] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // ======== NEW ENHANCED STATE (OPTIONAL) ========
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'error'>('healthy');
  const [performanceMetrics, setPerformanceMetrics] = useState({
    avgLoadTime: 0,
    errorRate: 0
  });

  // ======== ENHANCED CALCULATION FUNCTION ========
  // Wraps your existing calculateFinancials with monitoring
  async function calculateFinancials() {
    return reggioMonitor.wrapOperation(
      'financial-calculations',
      async () => {
        setLoading(true);
        
        try {
          // ======== ALL YOUR EXISTING CALCULATION LOGIC PRESERVED ========
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
          });

          // Capital calculations
          const cap0 = computeCapitalFromPortfolio(portfolio0, capitalBase0);
          setCapitalData(cap0);

          // ======== ALL YOUR EXISTING STRESS TESTING LOGIC PRESERVED ========
          const stressScenarios = [
            { name: "Mild Recession", assetShocks: { CORPORATE: -0.15 }, fundingShocks: { WHOLESALE_FUNDING: -0.30 } },
            { name: "Severe Recession", assetShocks: { CORPORATE: -0.35, PROPERTY: -0.25 }, fundingShocks: { WHOLESALE_FUNDING: -0.50, CORPORATE_DEPOSITS: -0.20 } },
            { name: "Market Crash", assetShocks: { CORPORATE: -0.50, PROPERTY: -0.40 }, fundingShocks: { WHOLESALE_FUNDING: -0.75, CORPORATE_DEPOSITS: -0.40 } },
          ];

          const results = stressScenarios.map((scenario, i) => {
            const shockedPortfolio = applyAssetShocks(portfolio0, scenario.assetShocks);
            const shockedOutflows = computeOutflows(funding0, scenario.fundingShocks);
            const shockedHQLA = computeHQLAWithBaselCaps(shockedPortfolio);
            const shockedCapital = computeCapitalFromPortfolio(shockedPortfolio, capitalBase0);

            const lcrRatio = shockedHQLA.hqla_capped / Math.max(shockedOutflows.total, 1);

            return {
              scenario_id: `stress_${i + 1}`,
              scenario_name: scenario.name,
              lcr_result: {
                lcr_ratio: lcrRatio,
                hqla_value: shockedHQLA.hqla_capped,
                net_cash_outflows: shockedOutflows.total,
                compliance_status: lcrRatio >= 1.0 ? "PASS" : "FAIL",
              },
              capital_result: shockedCapital,
              asset_shocks: scenario.assetShocks,
              funding_shocks: scenario.fundingShocks,
            };
          });

          setStressResults(results);
          setLastUpdated(new Date());
          
          // Update health status
          setHealthStatus('healthy');
          
        } catch (error) {
          console.error('Financial calculation error:', error);
          setHealthStatus('error');
          throw error; // Re-throw to let monitoring handle it
        } finally {
          setLoading(false);
        }
      },
      // Fallback data in case of complete failure
      {
        lcr_ratio: 1.082,
        requirement: 1.0,
        compliance_status: "COMPLIANT"
      }
    );
  }

  // ======== PRESERVED EXISTING KEY METRICS LOGIC ========
  const getKeyMetrics = () => {
    if (!lcrData || !capitalData) return {};

    const failed = stressResults.filter(r => r.lcr_result?.compliance_status === "FAIL").length;
    const worstLcr = stressResults.length > 0
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

  // ======== ENHANCED REFRESH FUNCTION ========
  // Wraps existing calculateFinancials with better error handling
  const refresh = async () => {
    try {
      await calculateFinancials();
      
      // Update performance metrics
      const monitor = reggioMonitor;
      const health = monitor.getHealthStatus();
      const financialMetrics = health.metrics.find(m => m.operationName === 'financial-calculations');
      
      if (financialMetrics) {
        setPerformanceMetrics({
          avgLoadTime: financialMetrics.avgDuration,
          errorRate: financialMetrics.errorRate
        });
      }
      
    } catch (error) {
      console.error('Failed to refresh financial data:', error);
      setHealthStatus('error');
      // Don't throw - let the component continue to function
    }
  };

  // ======== PRESERVED EXISTING INITIALIZATION ========
  useEffect(() => {
    calculateFinancials();
    const interval = setInterval(calculateFinancials, 5 * 60 * 1000); // Same 5-minute interval
    return () => clearInterval(interval);
  }, []);

  // ======== RETURN OBJECT - PRESERVES EXISTING + ADDS OPTIONAL ENHANCEMENTS ========
  return {
    // ======== EXISTING PROPERTIES - UNCHANGED ========
    loading,
    keyMetrics: getKeyMetrics(),
    lcrData,
    capitalData,
    stressResults,
    regulatoryAlerts: [], // Preserved as empty array
    strategicRecommendations: [], // Preserved as empty array
    lastUpdated,
    refresh,
    
    // ======== NEW OPTIONAL PROPERTIES ========
    healthStatus,
    performanceMetrics,
  };
}

// ======== BACKWARD COMPATIBILITY EXPORT ========
// If you need to preserve the exact original interface
export function useOriginalFinancialData() {
  const enhanced = useFinancialData();
  
  // Return only the original properties
  return {
    loading: enhanced.loading,
    keyMetrics: enhanced.keyMetrics,
    lcrData: enhanced.lcrData,
    capitalData: enhanced.capitalData,
    stressResults: enhanced.stressResults,
    regulatoryAlerts: enhanced.regulatoryAlerts,
    strategicRecommendations: enhanced.strategicRecommendations,
    lastUpdated: enhanced.lastUpdated,
    refresh: enhanced.refresh,
  };
}
