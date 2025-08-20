// src/lib/stress-test-engine.ts
// Simple wrapper around your existing financial-modeling.ts infrastructure
// This provides the interface expected by StressTestDashboard while using your existing calculations

import { 
  StressTestingEngine as ExistingStressEngine,
  LiquidityCoverageRatioCalculator,
  CapitalAdequacyCalculator,
  type PortfolioAsset,
  type FundingProfile,
  type RegulatoryParameters,
  type CapitalBase,
  type StressScenario as ExistingStressScenario,
  type StressTestResult as ExistingStressTestResult
} from './financial-modeling';

// Re-export the existing types for compatibility
export type {
  PortfolioAsset,
  FundingProfile,
  RegulatoryParameters,
  CapitalBase
} from './financial-modeling';

// Simplified interface for the dashboard (wrapper around existing types)
export interface StressTestAsset extends PortfolioAsset {}
export interface StressTestFunding extends FundingProfile {}

export interface StressScenario extends ExistingStressScenario {}
export interface StressTestResult extends ExistingStressTestResult {}

// Pre-defined regulatory scenarios using your existing format
export const REGULATORY_SCENARIOS: StressScenario[] = [
  {
    name: 'Bank of England 2024 ACS',
    asset_shocks: {
      'SOVEREIGN': -0.05,    // 5% gilt repricing
      'CORPORATE': -0.25,    // 25% corporate bond stress
      'EQUITY': -0.35,       // 35% equity market fall (BOE ACS 2024)
      'PROPERTY': -0.31      // 31% property price fall
    },
    funding_shocks: {
      'RETAIL_DEPOSITS': -0.08,      // 8% retail deposit outflow
      'CORPORATE_DEPOSITS': -0.25,   // 25% corporate deposit outflow
      'WHOLESALE_FUNDING': -1.0      // 100% wholesale funding loss
    },
    capital_base: {
      tier1_capital: 150_000_000,
      tier2_capital: 35_000_000
    }
  },
  {
    name: 'ECB 2024 Adverse Scenario',
    asset_shocks: {
      'SOVEREIGN': -0.03,
      'CORPORATE': -0.22,
      'EQUITY': -0.45,       // 45% equity stress (ECB more severe)
      'PROPERTY': -0.20
    },
    funding_shocks: {
      'RETAIL_DEPOSITS': -0.06,
      'CORPORATE_DEPOSITS': -0.20,
      'WHOLESALE_FUNDING': -0.75
    },
    capital_base: {
      tier1_capital: 150_000_000,
      tier2_capital: 35_000_000
    }
  },
  {
    name: 'Fed 2024 CCAR Severely Adverse',
    asset_shocks: {
      'SOVEREIGN': -0.02,    // US Treasuries more stable
      'CORPORATE': -0.30,
      'EQUITY': -0.55,       // 55% equity stress (Fed most severe)
      'PROPERTY': -0.40
    },
    funding_shocks: {
      'RETAIL_DEPOSITS': -0.05,
      'CORPORATE_DEPOSITS': -0.15,
      'WHOLESALE_FUNDING': -0.50
    },
    capital_base: {
      tier1_capital: 150_000_000,
      tier2_capital: 35_000_000
    }
  },
  {
    name: 'Basel III Minimum Requirements',
    asset_shocks: {
      'SOVEREIGN': -0.01,
      'CORPORATE': -0.15,
      'EQUITY': -0.20,
      'PROPERTY': -0.15
    },
    funding_shocks: {
      'RETAIL_DEPOSITS': -0.03,
      'CORPORATE_DEPOSITS': -0.10,
      'WHOLESALE_FUNDING': -0.25
    },
    capital_base: {
      tier1_capital: 150_000_000,
      tier2_capital: 35_000_000
    }
  }
];

/**
 * Wrapper class that uses your existing StressTestingEngine
 * Provides a simplified interface for the StressTestDashboard
 */
export class StressTestEngine {
  private existingEngine: ExistingStressEngine;

  constructor(
    assets: StressTestAsset[], 
    funding: StressTestFunding, 
    tier1Capital: number = 150_000_000
  ) {
    // Create regulatory parameters consistent with UK requirements
    const ukRegulatoryParams: RegulatoryParameters = {
      jurisdiction: 'UK',
      applicable_date: '2024-01-01',
      lcr_requirement: 1.05, // 105% LCR requirement
      nsfr_requirement: 1.0,
      tier1_minimum: 0.06, // 6%
      total_capital_minimum: 0.08, // 8%
      leverage_ratio_minimum: 0.03, // 3%
      large_exposure_limit: 0.25, // 25%
      stress_test_scenarios: []
    };

    // Initialize your existing stress testing engine
    this.existingEngine = new ExistingStressEngine(
      assets,
      funding,
      ukRegulatoryParams
    );
  }

  /**
   * Run a stress scenario using your existing engine
   */
  runStressScenario(scenario: StressScenario): StressTestResult {
    return this.existingEngine.runStressScenario(scenario);
  }

  /**
   * Run multiple scenarios and return comparative results
   */
  runMultipleScenarios(scenarios: StressScenario[]) {
    return this.existingEngine.runMultipleScenarios(scenarios);
  }
}

/**
 * Utility functions for the dashboard
 */

// Format currency in millions for dashboard display
export const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) {
    return `£${(value / 1_000_000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1_000) {
    return `£${(value / 1_000).toFixed(0)}K`;
  } else {
    return `£${value.toFixed(0)}`;
  }
};

// Format percentage with 1 decimal place
export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

// Determine status badge color based on compliance
export const getStatusColor = (pass: boolean): string => {
  return pass ? 'bg-green-100 text-green-800 border-green-300' : 
                'bg-red-100 text-red-800 border-red-300';
};

// Get confidence level color for business impact
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.9) return 'text-green-600';
  if (confidence >= 0.8) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * Helper function to create a stress test engine with default UK regulatory parameters
 */
export const createDefaultStressTestEngine = (
  assets: StressTestAsset[],
  funding: StressTestFunding
): StressTestEngine => {
  return new StressTestEngine(assets, funding, 150_000_000);
};

/**
 * Helper function to get summary metrics from stress test results
 */
export const calculateSummaryMetrics = (results: StressTestResult[]) => {
  if (results.length === 0) return null;

  const scenariosPassed = results.filter(r => 
    r.lcr_result.compliance_status === 'COMPLIANT' && 
    r.capital_result.compliance_status.tier1_compliant
  ).length;
  
  const worstLCR = Math.min(...results.map(r => r.lcr_result.lcr_ratio));
  
  // Calculate business impact metrics based on regulatory shortfalls
  const maxCapitalShortfall = Math.max(...results.map(r => {
    const tier1Shortfall = Math.max(0, 
      r.capital_result.capital_requirements.tier1_minimum - 
      (r.capital_result.tier1_capital_ratio * r.capital_result.risk_weighted_assets)
    );
    return tier1Shortfall;
  }));
  
  const maxLendingReduction = Math.max(...results.map(r => {
    const lcrDeficit = Math.max(0, r.lcr_result.requirement - r.lcr_result.lcr_ratio);
    return lcrDeficit * 300_000_000; // Estimate lending impact
  }));

  return {
    scenarios_tested: results.length,
    scenarios_passed: scenariosPassed,
    worst_lcr: worstLCR,
    max_capital_shortfall: maxCapitalShortfall,
    max_lending_reduction: maxLendingReduction,
    pass_rate: (scenariosPassed / results.length) * 100
  };
};

/**
 * Extract stress test requirements from regulatory clauses
 * This function will be enhanced when we integrate with the reggio-ingest function
 */
export const extractStressTestRequirements = (clauses: any[]): StressScenario[] => {
  // TODO: Use AI to extract actual stress test parameters from regulatory text
  // For now, return the standard regulatory scenarios
  return REGULATORY_SCENARIOS;
};

// Export default scenarios for immediate use
export default {
  StressTestEngine,
  REGULATORY_SCENARIOS,
  formatCurrency,
  formatPercentage,
  calculateSummaryMetrics,
  createDefaultStressTestEngine
};
