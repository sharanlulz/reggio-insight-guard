// Reggio Financial Modeling Engine - Core Implementation
// This provides the quantitative backbone for regulatory-financial intelligence

import { z } from 'zod';

// ============================================================================
// CORE DATA MODELS
// ============================================================================

// Portfolio Data Structures
export const PortfolioAssetSchema = z.object({
  id: z.string(),
  assetClass: z.enum(['SOVEREIGN', 'CORPORATE', 'EQUITY', 'DERIVATIVE', 'CASH', 'PROPERTY']),
  market_value: z.number(),
  notional_value: z.number().optional(),
  maturity_date: z.string().optional(),
  rating: z.string().optional(),
  jurisdiction: z.string(),
  sector: z.string().optional(),
  counterparty: z.string().optional(),
  // Risk weightings for different frameworks
  basel_risk_weight: z.number().optional(),
  crd_risk_weight: z.number().optional(),
  liquidity_classification: z.enum(['HQLA_L1', 'HQLA_L2A', 'HQLA_L2B', 'NON_HQLA']).optional()
});

export const FundingProfileSchema = z.object({
  retail_deposits: z.number(),
  corporate_deposits: z.number(),
  wholesale_funding: z.number(),
  secured_funding: z.number(),
  stable_funding_ratio: z.number(), // For NSFR calculations
  deposit_concentration: z.record(z.string(), z.number()) // By counterparty
});

export const RegulatoryParametersSchema = z.object({
  jurisdiction: z.string(),
  applicable_date: z.string(),
  lcr_requirement: z.number().default(1.0), // 100%
  nsfr_requirement: z.number().default(1.0), // 100%
  tier1_minimum: z.number().default(0.06), // 6%
  total_capital_minimum: z.number().default(0.08), // 8%
  leverage_ratio_minimum: z.number().default(0.03), // 3%
  large_exposure_limit: z.number().default(0.25), // 25% of capital
  stress_test_scenarios: z.array(z.object({
    name: z.string(),
    shock_factors: z.record(z.string(), z.number())
  }))
});

export type PortfolioAsset = z.infer<typeof PortfolioAssetSchema>;
export type FundingProfile = z.infer<typeof FundingProfileSchema>;
export type RegulatoryParameters = z.infer<typeof RegulatoryParametersSchema>;

// Export interfaces for CapitalBase and StressScenario
export interface CapitalBase {
  tier1_capital: number;
  tier2_capital: number;
}

export interface StressScenario {
  name: string;
  asset_shocks: Record<string, number>; // Asset class -> shock percentage
  funding_shocks: Record<string, number>; // Funding type -> shock percentage
  capital_base: CapitalBase;
}

// ============================================================================
// LIQUIDITY COVERAGE RATIO (LCR) ENGINE
// ============================================================================

export class LiquidityCoverageRatioCalculator {
  private assets: PortfolioAsset[];
  private funding: FundingProfile;
  private parameters: RegulatoryParameters;

  constructor(
    assets: PortfolioAsset[], 
    funding: FundingProfile, 
    parameters: RegulatoryParameters
  ) {
    this.assets = assets;
    this.funding = funding;
    this.parameters = parameters;
  }

  calculateLCR(): LCRResult {
    const hqla = this.calculateHQLA();
    const netOutflows = this.calculateNetCashOutflows();
    const lcr = netOutflows > 0 ? hqla / netOutflows : Infinity;

    return {
      lcr_ratio: lcr,
      hqla_value: hqla,
      net_cash_outflows: netOutflows,
      requirement: this.parameters.lcr_requirement,
      compliance_status: lcr >= this.parameters.lcr_requirement ? 'COMPLIANT' : 'NON_COMPLIANT',
      buffer_or_deficit: hqla - (netOutflows * this.parameters.lcr_requirement),
      breakdown: {
        level1_assets: this.getAssetsByLiquidityLevel('HQLA_L1'),
        level2a_assets: this.getAssetsByLiquidityLevel('HQLA_L2A'),
        level2b_assets: this.getAssetsByLiquidityLevel('HQLA_L2B'),
        retail_outflow_rate: 0.03, // 3% under stress
        corporate_outflow_rate: 0.20, // 20% under stress
        wholesale_outflow_rate: 1.0 // 100% under stress
      }
    };
  }

  private calculateHQLA(): number {
    let hqla = 0;
    
    this.assets.forEach(asset => {
      if (asset.liquidity_classification === 'HQLA_L1') {
        hqla += asset.market_value; // 100% haircut
      } else if (asset.liquidity_classification === 'HQLA_L2A') {
        hqla += asset.market_value * 0.85; // 15% haircut
      } else if (asset.liquidity_classification === 'HQLA_L2B') {
        hqla += asset.market_value * 0.75; // 25% haircut (with 40% cap)
      }
    });

    // Apply Level 2B cap (40% of total HQLA)
    const level2BValue = this.assets
      .filter(a => a.liquidity_classification === 'HQLA_L2B')
      .reduce((sum, a) => sum + a.market_value * 0.75, 0);
    
    if (level2BValue > hqla * 0.4) {
      hqla = hqla - level2BValue + (hqla * 0.4);
    }

    return hqla;
  }

  private calculateNetCashOutflows(): number {
    const retailOutflows = this.funding.retail_deposits * 0.03;
    const corporateOutflows = this.funding.corporate_deposits * 0.20;
    const wholesaleOutflows = this.funding.wholesale_funding * 1.0;
    
    // Simplified - real calculation would include many more factors
    return retailOutflows + corporateOutflows + wholesaleOutflows;
  }

  private getAssetsByLiquidityLevel(level: string): PortfolioAsset[] {
    return this.assets.filter(a => a.liquidity_classification === level);
  }
}

interface LCRResult {
  lcr_ratio: number;
  hqla_value: number;
  net_cash_outflows: number;
  requirement: number;
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT';
  buffer_or_deficit: number;
  breakdown: {
    level1_assets: PortfolioAsset[];
    level2a_assets: PortfolioAsset[];
    level2b_assets: PortfolioAsset[];
    retail_outflow_rate: number;
    corporate_outflow_rate: number;
    wholesale_outflow_rate: number;
  };
}

// ============================================================================
// CAPITAL ADEQUACY CALCULATOR
// ============================================================================

export class CapitalAdequacyCalculator {
  private assets: PortfolioAsset[];
  private parameters: RegulatoryParameters;
  
  constructor(assets: PortfolioAsset[], parameters: RegulatoryParameters) {
    this.assets = assets;
    this.parameters = parameters;
  }

  calculateCapitalRatios(capitalBase: CapitalBase): CapitalAdequacyResult {
    const rwa = this.calculateRiskWeightedAssets();
    const tier1Ratio = capitalBase.tier1_capital / rwa;
    const totalCapitalRatio = (capitalBase.tier1_capital + capitalBase.tier2_capital) / rwa;
    const leverageRatio = capitalBase.tier1_capital / this.calculateTotalExposure();

    return {
      risk_weighted_assets: rwa,
      tier1_capital_ratio: tier1Ratio,
      total_capital_ratio: totalCapitalRatio,
      leverage_ratio: leverageRatio,
      capital_requirements: {
        tier1_minimum: rwa * this.parameters.tier1_minimum,
        total_capital_minimum: rwa * this.parameters.total_capital_minimum,
        leverage_minimum: this.calculateTotalExposure() * this.parameters.leverage_ratio_minimum
      },
      compliance_status: {
        tier1_compliant: tier1Ratio >= this.parameters.tier1_minimum,
        total_capital_compliant: totalCapitalRatio >= this.parameters.total_capital_minimum,
        leverage_compliant: leverageRatio >= this.parameters.leverage_ratio_minimum
      },
      buffers_and_surcharges: this.calculateBuffers(rwa),
      large_exposures: this.checkLargeExposures(capitalBase.tier1_capital)
    };
  }

  private calculateRiskWeightedAssets(): number {
    return this.assets.reduce((total, asset) => {
      const riskWeight = asset.basel_risk_weight || this.getStandardRiskWeight(asset);
      return total + (asset.market_value * riskWeight);
    }, 0);
  }

  private getStandardRiskWeight(asset: PortfolioAsset): number {
    // Simplified Basel III risk weights
    switch (asset.assetClass) {
      case 'CASH': return 0.0;
      case 'SOVEREIGN': 
        return asset.rating?.startsWith('AAA') ? 0.0 : 0.2;
      case 'CORPORATE':
        if (asset.rating?.startsWith('AAA')) return 0.2;
        if (asset.rating?.startsWith('AA')) return 0.5;
        return 1.0;
      case 'EQUITY': return 2.5; // For listed equities
      case 'PROPERTY': return 1.0;
      default: return 1.0;
    }
  }

  private calculateTotalExposure(): number {
    return this.assets.reduce((total, asset) => total + asset.market_value, 0);
  }

  private calculateBuffers(rwa: number): BufferRequirements {
    return {
      capital_conservation_buffer: rwa * 0.025, // 2.5%
      countercyclical_buffer: rwa * 0.01, // Assumed 1%
      systemic_risk_buffer: rwa * 0.005, // Assumed 0.5%
      total_buffer_requirement: rwa * 0.04 // 4% total
    };
  }

  private checkLargeExposures(tier1Capital: number): LargeExposureAnalysis[] {
    const exposureLimit = tier1Capital * this.parameters.large_exposure_limit;
    const exposuresByCounterparty = new Map<string, number>();

    // Aggregate exposures by counterparty
    this.assets.forEach(asset => {
      if (asset.counterparty) {
        const current = exposuresByCounterparty.get(asset.counterparty) || 0;
        exposuresByCounterparty.set(asset.counterparty, current + asset.market_value);
      }
    });

    return Array.from(exposuresByCounterparty.entries())
      .filter(([_, exposure]) => exposure > exposureLimit * 0.1) // Report exposures > 10% of limit
      .map(([counterparty, exposure]) => ({
        counterparty,
        exposure_amount: exposure,
        limit: exposureLimit,
        utilization_percentage: (exposure / exposureLimit) * 100,
        compliance_status: exposure <= exposureLimit ? 'COMPLIANT' : 'BREACH'
      }));
  }
}

// CapitalBase interface moved to top of file

interface CapitalAdequacyResult {
  risk_weighted_assets: number;
  tier1_capital_ratio: number;
  total_capital_ratio: number;
  leverage_ratio: number;
  capital_requirements: {
    tier1_minimum: number;
    total_capital_minimum: number;
    leverage_minimum: number;
  };
  compliance_status: {
    tier1_compliant: boolean;
    total_capital_compliant: boolean;
    leverage_compliant: boolean;
  };
  buffers_and_surcharges: BufferRequirements;
  large_exposures: LargeExposureAnalysis[];
}

interface BufferRequirements {
  capital_conservation_buffer: number;
  countercyclical_buffer: number;
  systemic_risk_buffer: number;
  total_buffer_requirement: number;
}

interface LargeExposureAnalysis {
  counterparty: string;
  exposure_amount: number;
  limit: number;
  utilization_percentage: number;
  compliance_status: 'COMPLIANT' | 'BREACH';
}

// ============================================================================
// STRESS TESTING ENGINE
// ============================================================================

export class StressTestingEngine {
  private baseAssets: PortfolioAsset[];
  private baseFunding: FundingProfile;
  private parameters: RegulatoryParameters;

  constructor(
    assets: PortfolioAsset[], 
    funding: FundingProfile, 
    parameters: RegulatoryParameters
  ) {
    this.baseAssets = assets;
    this.baseFunding = funding;
    this.parameters = parameters;
  }

  runStressScenario(scenario: StressScenario): StressTestResult {
    // Apply stress shocks to portfolio
    const stressedAssets = this.applyAssetShocks(scenario.asset_shocks);
    const stressedFunding = this.applyFundingShocks(scenario.funding_shocks);

    // Recalculate metrics under stress
    const lcr = new LiquidityCoverageRatioCalculator(
      stressedAssets, 
      stressedFunding, 
      this.parameters
    ).calculateLCR();

    const capitalCalc = new CapitalAdequacyCalculator(stressedAssets, this.parameters);
    const capitalResult = capitalCalc.calculateCapitalRatios({
      tier1_capital: scenario.capital_base.tier1_capital,
      tier2_capital: scenario.capital_base.tier2_capital
    });

    return {
      scenario_name: scenario.name,
      lcr_result: lcr,
      capital_result: capitalResult,
      overall_assessment: this.assessOverallRisk(lcr, capitalResult),
      recommendations: this.generateRecommendations(lcr, capitalResult)
    };
  }

  runMultipleScenarios(scenarios: StressScenario[]): MultiScenarioResult {
    const results = scenarios.map(scenario => this.runStressScenario(scenario));
    
    return {
      individual_results: results,
      comparative_analysis: this.compareScenarios(results),
      worst_case_metrics: this.identifyWorstCase(results),
      pass_fail_summary: this.summarizePassFail(results)
    };
  }

  private applyAssetShocks(shocks: Record<string, number>): PortfolioAsset[] {
    return this.baseAssets.map(asset => ({
      ...asset,
      market_value: asset.market_value * (1 + (shocks[asset.assetClass] || 0))
    }));
  }

  private applyFundingShocks(shocks: Record<string, number>): FundingProfile {
    return {
      ...this.baseFunding,
      retail_deposits: this.baseFunding.retail_deposits * (1 + (shocks['RETAIL_DEPOSITS'] || 0)),
      corporate_deposits: this.baseFunding.corporate_deposits * (1 + (shocks['CORPORATE_DEPOSITS'] || 0)),
      wholesale_funding: this.baseFunding.wholesale_funding * (1 + (shocks['WHOLESALE_FUNDING'] || 0))
    };
  }

  private assessOverallRisk(lcr: LCRResult, capital: CapitalAdequacyResult): RiskAssessment {
    const risks: string[] = [];
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    if (!lcr.compliance_status || lcr.compliance_status === 'NON_COMPLIANT') {
      risks.push('LCR breach - liquidity risk');
      severity = 'HIGH';
    }

    if (!capital.compliance_status.tier1_compliant) {
      risks.push('Tier 1 capital breach');
      severity = 'HIGH';
    }

    if (!capital.compliance_status.leverage_compliant) {
      risks.push('Leverage ratio breach');
      severity = severity === 'HIGH' ? 'HIGH' : 'MEDIUM';
    }

    return {
      overall_severity: severity,
      risk_factors: risks,
      confidence_level: 0.85 // Placeholder - would be model-derived
    };
  }

  private generateRecommendations(lcr: LCRResult, capital: CapitalAdequacyResult): string[] {
    const recommendations: string[] = [];

    if (lcr.buffer_or_deficit < 0) {
      recommendations.push(`Increase HQLA by ${Math.abs(lcr.buffer_or_deficit).toFixed(0)}M to meet LCR requirements`);
    }

    if (!capital.compliance_status.tier1_compliant) {
      const shortfall = capital.capital_requirements.tier1_minimum - 
        (capital.tier1_capital_ratio * capital.risk_weighted_assets);
      recommendations.push(`Raise ${shortfall.toFixed(0)}M in Tier 1 capital`);
    }

    capital.large_exposures
      .filter(le => le.compliance_status === 'BREACH')
      .forEach(le => {
        recommendations.push(`Reduce exposure to ${le.counterparty} by ${(le.exposure_amount - le.limit).toFixed(0)}M`);
      });

    return recommendations;
  }

  private compareScenarios(results: StressTestResult[]): ScenarioComparison {
    return {
      lcr_range: {
        min: Math.min(...results.map(r => r.lcr_result.lcr_ratio)),
        max: Math.max(...results.map(r => r.lcr_result.lcr_ratio)),
        average: results.reduce((sum, r) => sum + r.lcr_result.lcr_ratio, 0) / results.length
      },
      tier1_range: {
        min: Math.min(...results.map(r => r.capital_result.tier1_capital_ratio)),
        max: Math.max(...results.map(r => r.capital_result.tier1_capital_ratio)),
        average: results.reduce((sum, r) => sum + r.capital_result.tier1_capital_ratio, 0) / results.length
      },
      most_impactful_scenario: results.reduce((worst, current) => 
        current.overall_assessment.overall_severity === 'HIGH' && 
        worst.overall_assessment.overall_severity !== 'HIGH' ? current : worst
      ).scenario_name
    };
  }

  private identifyWorstCase(results: StressTestResult[]): WorstCaseMetrics {
    const worstLCR = Math.min(...results.map(r => r.lcr_result.lcr_ratio));
    const worstTier1 = Math.min(...results.map(r => r.capital_result.tier1_capital_ratio));
    
    return {
      worst_lcr: worstLCR,
      worst_tier1_ratio: worstTier1,
      scenarios_failed: results.filter(r => 
        r.lcr_result.compliance_status === 'NON_COMPLIANT' ||
        !r.capital_result.compliance_status.tier1_compliant
      ).length,
      total_scenarios: results.length
    };
  }

  private summarizePassFail(results: StressTestResult[]): PassFailSummary {
    const passed = results.filter(r => 
      r.lcr_result.compliance_status === 'COMPLIANT' &&
      r.capital_result.compliance_status.tier1_compliant &&
      r.capital_result.compliance_status.total_capital_compliant
    ).length;

    return {
      scenarios_passed: passed,
      scenarios_failed: results.length - passed,
      pass_rate: (passed / results.length) * 100,
      critical_failures: results.filter(r => r.overall_assessment.overall_severity === 'HIGH').length
    };
  }
}

// StressScenario interface moved to top of file

interface StressTestResult {
  scenario_name: string;
  lcr_result: LCRResult;
  capital_result: CapitalAdequacyResult;
  overall_assessment: RiskAssessment;
  recommendations: string[];
}

interface RiskAssessment {
  overall_severity: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_factors: string[];
  confidence_level: number;
}

interface MultiScenarioResult {
  individual_results: StressTestResult[];
  comparative_analysis: ScenarioComparison;
  worst_case_metrics: WorstCaseMetrics;
  pass_fail_summary: PassFailSummary;
}

interface ScenarioComparison {
  lcr_range: { min: number; max: number; average: number; };
  tier1_range: { min: number; max: number; average: number; };
  most_impactful_scenario: string;
}

interface WorstCaseMetrics {
  worst_lcr: number;
  worst_tier1_ratio: number;
  scenarios_failed: number;
  total_scenarios: number;
}

interface PassFailSummary {
  scenarios_passed: number;
  scenarios_failed: number;
  pass_rate: number;
  critical_failures: number;
}

// ============================================================================
// REGULATORY IMPACT ANALYZER
// ============================================================================

export class RegulatoryImpactAnalyzer {
  private modelingEngine: {
    lcr: LiquidityCoverageRatioCalculator;
    capital: CapitalAdequacyCalculator;
    stress: StressTestingEngine;
  };

  constructor(
    assets: PortfolioAsset[], 
    funding: FundingProfile, 
    parameters: RegulatoryParameters,
    capitalBase: CapitalBase
  ) {
    this.modelingEngine = {
      lcr: new LiquidityCoverageRatioCalculator(assets, funding, parameters),
      capital: new CapitalAdequacyCalculator(assets, parameters),
      stress: new StressTestingEngine(assets, funding, parameters)
    };
  }

  analyzeRegulatoryChange(
    currentRegulation: RegulatoryParameters,
    proposedRegulation: RegulatoryParameters,
    capitalBase: CapitalBase
  ): RegulatoryImpactResult {
    // Calculate current state
    const currentLCR = this.modelingEngine.lcr.calculateLCR();
    const currentCapital = this.modelingEngine.capital.calculateCapitalRatios(capitalBase);

    // Update parameters and recalculate
    const newLCRCalc = new LiquidityCoverageRatioCalculator(
      this.modelingEngine.lcr['assets'], 
      this.modelingEngine.lcr['funding'], 
      proposedRegulation
    );
    const newCapitalCalc = new CapitalAdequacyCalculator(
      this.modelingEngine.capital['assets'], 
      proposedRegulation
    );

    const proposedLCR = newLCRCalc.calculateLCR();
    const proposedCapital = newCapitalCalc.calculateCapitalRatios(capitalBase);

    return {
      impact_summary: {
        lcr_impact: proposedLCR.lcr_ratio - currentLCR.lcr_ratio,
        tier1_impact: proposedCapital.tier1_capital_ratio - currentCapital.tier1_capital_ratio,
        capital_requirement_change: 
          proposedCapital.capital_requirements.tier1_minimum - 
          currentCapital.capital_requirements.tier1_minimum
      },
      compliance_changes: {
        current_compliance: this.assessCompliance(currentLCR, currentCapital),
        proposed_compliance: this.assessCompliance(proposedLCR, proposedCapital),
        newly_non_compliant: this.identifyNewBreaches(currentLCR, currentCapital, proposedLCR, proposedCapital)
      },
      financial_impact: {
        additional_capital_required: Math.max(0, 
          proposedCapital.capital_requirements.tier1_minimum - capitalBase.tier1_capital
        ),
        additional_liquidity_required: Math.max(0, -proposedLCR.buffer_or_deficit),
        estimated_cost: this.estimateComplianceCost(proposedLCR, proposedCapital, capitalBase)
      },
      strategic_recommendations: this.generateStrategicRecommendations(
        currentLCR, currentCapital, proposedLCR, proposedCapital
      )
    };
  }

  private assessCompliance(lcr: LCRResult, capital: CapitalAdequacyResult): ComplianceStatus {
    return {
      lcr_compliant: lcr.compliance_status === 'COMPLIANT',
      tier1_compliant: capital.compliance_status.tier1_compliant,
      total_capital_compliant: capital.compliance_status.total_capital_compliant,
      leverage_compliant: capital.compliance_status.leverage_compliant,
      overall_compliant: 
        lcr.compliance_status === 'COMPLIANT' && 
        capital.compliance_status.tier1_compliant &&
        capital.compliance_status.total_capital_compliant &&
        capital.compliance_status.leverage_compliant
    };
  }

  private identifyNewBreaches(
    currentLCR: LCRResult, currentCapital: CapitalAdequacyResult,
    proposedLCR: LCRResult, proposedCapital: CapitalAdequacyResult
  ): string[] {
    const breaches: string[] = [];

    if (currentLCR.compliance_status === 'COMPLIANT' && proposedLCR.compliance_status === 'NON_COMPLIANT') {
      breaches.push('LCR will become non-compliant');
    }

    if (currentCapital.compliance_status.tier1_compliant && !proposedCapital.compliance_status.tier1_compliant) {
      breaches.push('Tier 1 capital will become non-compliant');
    }

    return breaches;
  }

  private estimateComplianceCost(lcr: LCRResult, capital: CapitalAdequacyResult, capitalBase: CapitalBase): CostEstimate {
    // Simplified cost modeling - real implementation would use market data
    const liquidityCostBps = 25; // 25 basis points for liquidity buffer
    const capitalCostBps = 800; // 800 basis points for equity capital

    return {
      liquidity_buffer_cost: Math.max(0, -lcr.buffer_or_deficit) * (liquidityCostBps / 10000),
      capital_raising_cost: Math.max(0, 
        capital.capital_requirements.tier1_minimum - capitalBase.tier1_capital
      ) * (capitalCostBps / 10000),
      total_annual_cost: 0 // Calculated as sum of above
    };
  }

  private generateStrategicRecommendations(
    currentLCR: LCRResult, currentCapital: CapitalAdequacyResult,
    proposedLCR: LCRResult, proposedCapital: CapitalAdequacyResult
  ): string[] {
    const recommendations: string[] = [];

    if (proposedLCR.lcr_ratio < currentLCR.lcr_ratio) {
      recommendations.push('Consider increasing HQLA allocation before regulation implementation');
    }

    if (proposedCapital.tier1_capital_ratio < currentCapital.tier1_capital_ratio) {
      recommendations.push('Evaluate capital raising options or asset optimization strategies');
    }

    if (proposedCapital.capital_requirements.tier1_minimum > currentCapital.capital_requirements.tier1_minimum) {
      const increase = proposedCapital.capital_requirements.tier1_minimum - currentCapital.capital_requirements.tier1_minimum;
      recommendations.push(`Plan for additional ${increase.toFixed(0)}M in Tier 1 capital requirements`);
    }

    return recommendations;
  }
}

interface RegulatoryImpactResult {
  impact_summary: {
    lcr_impact: number;
    tier1_impact: number;
    capital_requirement_change: number;
  };
  compliance_changes: {
    current_compliance: ComplianceStatus;
    proposed_compliance: ComplianceStatus;
    newly_non_compliant: string[];
  };
  financial_impact: {
    additional_capital_required: number;
    additional_liquidity_required: number;
    estimated_cost: CostEstimate;
  };
  strategic_recommendations: string[];
}

interface ComplianceStatus {
  lcr_compliant: boolean;
  tier1_compliant: boolean;
  total_capital_compliant: boolean;
  leverage_compliant: boolean;
  overall_compliant: boolean;
}

interface CostEstimate {
  liquidity_buffer_cost: number;
  capital_raising_cost: number;
  total_annual_cost: number;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

export function demonstrateFinancialModelingEngine() {
  // Sample portfolio data
  const sampleAssets: PortfolioAsset[] = [
    {
      id: '1',
      assetClass: 'SOVEREIGN',
      market_value: 100_000_000,
      notional_value: 100_000_000,
      rating: 'AAA',
      jurisdiction: 'UK',
      basel_risk_weight: 0.0,
      liquidity_classification: 'HQLA_L1'
    },
    {
      id: '2',
      assetClass: 'CORPORATE',
      market_value: 50_000_000,
      notional_value: 50_000_000,
      rating: 'AA-',
      jurisdiction: 'UK',
      sector: 'Financial',
      basel_risk_weight: 0.2,
      liquidity_classification: 'NON_HQLA'
    }
  ];

  const sampleFunding: FundingProfile = {
    retail_deposits: 200_000_000,
    corporate_deposits: 100_000_000,
    wholesale_funding: 50_000_000,
    secured_funding: 25_000_000,
    stable_funding_ratio: 0.85,
    deposit_concentration: {
      'Major Corp A': 20_000_000,
      'Major Corp B': 15_000_000
    }
  };

  const regulatoryParams: RegulatoryParameters = {
    jurisdiction: 'UK',
    applicable_date: '2024-01-01',
    lcr_requirement: 1.0,
    nsfr_requirement: 1.0,
    tier1_minimum: 0.06,
    total_capital_minimum: 0.08,
    leverage_ratio_minimum: 0.03,
    large_exposure_limit: 0.25,
    stress_test_scenarios: [
      {
        name: 'Bank of England Stress Scenario',
        shock_factors: {
          'EQUITY': -0.30,
          'CORPORATE': -0.15,
          'PROPERTY': -0.25
        }
      }
    ]
  };

  const capitalBase: CapitalBase = {
    tier1_capital: 50_000_000,
    tier2_capital: 10_000_000
  };

  // Run calculations
  const lcrCalc = new LiquidityCoverageRatioCalculator(sampleAssets, sampleFunding, regulatoryParams);
  const lcrResult = lcrCalc.calculateLCR();

  const capitalCalc = new CapitalAdequacyCalculator(sampleAssets, regulatoryParams);
  const capitalResult = capitalCalc.calculateCapitalRatios(capitalBase);

  const stressEngine = new StressTestingEngine(sampleAssets, sampleFunding, regulatoryParams);
  const stressScenario: StressScenario = {
    name: 'Severe Economic Downturn',
    asset_shocks: {
      'SOVEREIGN': -0.05,
      'CORPORATE': -0.25,
      'EQUITY': -0.40
    },
    funding_shocks: {
      'RETAIL_DEPOSITS': -0.10,
      'CORPORATE_DEPOSITS': -0.30,
      'WHOLESALE_FUNDING': -0.50
    },
    capital_base: capitalBase
  };

  const stressResult = stressEngine.runStressScenario(stressScenario);

  // Regulatory impact analysis
  const impactAnalyzer = new RegulatoryImpactAnalyzer(
    sampleAssets, 
    sampleFunding, 
    regulatoryParams,
    capitalBase
  );

  const proposedRegulation: RegulatoryParameters = {
    ...regulatoryParams,
    lcr_requirement: 1.10, // Increase to 110%
    tier1_minimum: 0.07 // Increase to 7%
  };

  const impactResult = impactAnalyzer.analyzeRegulatoryChange(
    regulatoryParams,
    proposedRegulation,
    capitalBase
  );

  return {
    lcr: lcrResult,
    capital: capitalResult,
    stress: stressResult,
    regulatory_impact: impactResult
  };
}

// ============================================================================
// INTEGRATION WITH REGGIO SCHEMA
// ============================================================================

// SQL schema extensions needed for the financial modeling engine
export const FINANCIAL_MODELING_SCHEMA = `
-- Extended tables for financial modeling
CREATE SCHEMA IF NOT EXISTS reggio_financial;

-- Portfolio data tables
CREATE TABLE reggio_financial.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES reggio.organizations(id),
  snapshot_date timestamptz NOT NULL,
  portfolio_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE reggio_financial.portfolio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_snapshot_id uuid NOT NULL REFERENCES reggio_financial.portfolio_snapshots(id),
  asset_id text NOT NULL,
  asset_class text NOT NULL,
  market_value decimal NOT NULL,
  notional_value decimal,
  maturity_date date,
  rating text,
  jurisdiction text,
  sector text,
  counterparty text,
  basel_risk_weight decimal,
  crd_risk_weight decimal,
  liquidity_classification text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE reggio_financial.funding_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES reggio.organizations(id),
  profile_date timestamptz NOT NULL,
  retail_deposits decimal NOT NULL DEFAULT 0,
  corporate_deposits decimal NOT NULL DEFAULT 0,
  wholesale_funding decimal NOT NULL DEFAULT 0,
  secured_funding decimal NOT NULL DEFAULT 0,
  stable_funding_ratio decimal NOT NULL DEFAULT 0,
  deposit_concentration jsonb,
  created_at timestamptz DEFAULT now()
);

-- Regulatory parameters by jurisdiction
CREATE TABLE reggio_financial.regulatory_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction text NOT NULL,
  regulator text NOT NULL,
  effective_date date NOT NULL,
  lcr_requirement decimal NOT NULL DEFAULT 1.0,
  nsfr_requirement decimal NOT NULL DEFAULT 1.0,
  tier1_minimum decimal NOT NULL DEFAULT 0.06,
  total_capital_minimum decimal NOT NULL DEFAULT 0.08,
  leverage_ratio_minimum decimal NOT NULL DEFAULT 0.03,
  large_exposure_limit decimal NOT NULL DEFAULT 0.25,
  additional_requirements jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(jurisdiction, regulator, effective_date)
);

-- Stress testing scenarios
CREATE TABLE reggio_financial.stress_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES reggio.organizations(id),
  scenario_name text NOT NULL,
  scenario_type text NOT NULL, -- 'SUPERVISORY', 'CUSTOM', 'HISTORICAL'
  asset_shocks jsonb NOT NULL,
  funding_shocks jsonb NOT NULL,
  macroeconomic_assumptions jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Results storage
CREATE TABLE reggio_financial.calculation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES reggio.organizations(id),
  calculation_type text NOT NULL, -- 'LCR', 'CAPITAL_ADEQUACY', 'STRESS_TEST', 'REGULATORY_IMPACT'
  portfolio_snapshot_id uuid REFERENCES reggio_financial.portfolio_snapshots(id),
  scenario_id uuid REFERENCES reggio_financial.stress_scenarios(id),
  regulation_id uuid REFERENCES reggio.regulations(id),
  results jsonb NOT NULL,
  calculation_timestamp timestamptz DEFAULT now(),
  calculated_by uuid
);

-- Indexes for performance
CREATE INDEX idx_portfolio_assets_snapshot ON reggio_financial.portfolio_assets(portfolio_snapshot_id);
CREATE INDEX idx_portfolio_assets_asset_class ON reggio_financial.portfolio_assets(asset_class);
CREATE INDEX idx_calculation_results_org ON reggio_financial.calculation_results(org_id);
CREATE INDEX idx_calculation_results_type ON reggio_financial.calculation_results(calculation_type);
CREATE INDEX idx_regulatory_params_jurisdiction ON reggio_financial.regulatory_parameters(jurisdiction);

-- Views for easier querying
CREATE OR REPLACE VIEW reggio_financial.latest_portfolio_by_org AS
SELECT DISTINCT ON (org_id) 
  org_id, 
  id as portfolio_snapshot_id,
  snapshot_date,
  portfolio_name
FROM reggio_financial.portfolio_snapshots 
ORDER BY org_id, snapshot_date DESC;

CREATE OR REPLACE VIEW reggio_financial.current_regulatory_parameters AS
SELECT DISTINCT ON (jurisdiction, regulator)
  jurisdiction,
  regulator,
  lcr_requirement,
  nsfr_requirement,
  tier1_minimum,
  total_capital_minimum,
  leverage_ratio_minimum,
  large_exposure_limit,
  effective_date
FROM reggio_financial.regulatory_parameters
ORDER BY jurisdiction, regulator, effective_date DESC;
`;

// ============================================================================
// SUPABASE INTEGRATION FUNCTIONS
// ============================================================================

export class ReggioFinancialModelingService {
  constructor(private supabaseClient: any) {}

  async savePortfolioSnapshot(
    orgId: string, 
    portfolioName: string, 
    assets: PortfolioAsset[]
  ): Promise<string> {
    // Insert portfolio snapshot
    const { data: snapshot, error: snapshotError } = await this.supabaseClient
      .from('portfolio_snapshots')
      .insert({
        org_id: orgId,
        snapshot_date: new Date().toISOString(),
        portfolio_name: portfolioName
      })
      .select('id')
      .single();

    if (snapshotError) throw new Error(`Failed to save portfolio snapshot: ${snapshotError.message}`);

    // Insert portfolio assets
    const assetRows = assets.map(asset => ({
      portfolio_snapshot_id: snapshot.id,
      asset_id: asset.id,
      asset_class: asset.assetClass,
      market_value: asset.market_value,
      notional_value: asset.notional_value,
      maturity_date: asset.maturity_date,
      rating: asset.rating,
      jurisdiction: asset.jurisdiction,
      sector: asset.sector,
      counterparty: asset.counterparty,
      basel_risk_weight: asset.basel_risk_weight,
      crd_risk_weight: asset.crd_risk_weight,
      liquidity_classification: asset.liquidity_classification
    }));

    const { error: assetsError } = await this.supabaseClient
      .from('portfolio_assets')
      .insert(assetRows);

    if (assetsError) throw new Error(`Failed to save portfolio assets: ${assetsError.message}`);

    return snapshot.id;
  }

  async saveCalculationResult(
    orgId: string,
    calculationType: string,
    results: any,
    portfolioSnapshotId?: string,
    scenarioId?: string,
    regulationId?: string
  ): Promise<void> {
    const { error } = await this.supabaseClient
      .from('calculation_results')
      .insert({
        org_id: orgId,
        calculation_type: calculationType,
        portfolio_snapshot_id: portfolioSnapshotId,
        scenario_id: scenarioId,
        regulation_id: regulationId,
        results: results
      });

    if (error) throw new Error(`Failed to save calculation results: ${error.message}`);
  }

  async loadLatestPortfolio(orgId: string): Promise<{assets: PortfolioAsset[], snapshotId: string} | null> {
    // Get latest portfolio snapshot
    const { data: snapshot, error: snapshotError } = await this.supabaseClient
      .from('latest_portfolio_by_org')
      .select('*')
      .eq('org_id', orgId)
      .single();

    if (snapshotError || !snapshot) return null;

    // Get portfolio assets
    const { data: assetRows, error: assetsError } = await this.supabaseClient
      .from('portfolio_assets')
      .select('*')
      .eq('portfolio_snapshot_id', snapshot.portfolio_snapshot_id);

    if (assetsError || !assetRows) return null;

    const assets: PortfolioAsset[] = assetRows.map(row => ({
      id: row.asset_id,
      assetClass: row.asset_class,
      market_value: parseFloat(row.market_value),
      notional_value: row.notional_value ? parseFloat(row.notional_value) : undefined,
      maturity_date: row.maturity_date,
      rating: row.rating,
      jurisdiction: row.jurisdiction,
      sector: row.sector,
      counterparty: row.counterparty,
      basel_risk_weight: row.basel_risk_weight ? parseFloat(row.basel_risk_weight) : undefined,
      crd_risk_weight: row.crd_risk_weight ? parseFloat(row.crd_risk_weight) : undefined,
      liquidity_classification: row.liquidity_classification
    }));

    return {
      assets,
      snapshotId: snapshot.portfolio_snapshot_id
    };
  }

  async getRegulatoryParameters(jurisdiction: string, regulator?: string): Promise<RegulatoryParameters | null> {
    let query = this.supabaseClient
      .from('current_regulatory_parameters')
      .select('*')
      .eq('jurisdiction', jurisdiction);

    if (regulator) {
      query = query.eq('regulator', regulator);
    }

    const { data, error } = await query.single();

    if (error || !data) return null;

    return {
      jurisdiction: data.jurisdiction,
      applicable_date: data.effective_date,
      lcr_requirement: parseFloat(data.lcr_requirement),
      nsfr_requirement: parseFloat(data.nsfr_requirement),
      tier1_minimum: parseFloat(data.tier1_minimum),
      total_capital_minimum: parseFloat(data.total_capital_minimum),
      leverage_ratio_minimum: parseFloat(data.leverage_ratio_minimum),
      large_exposure_limit: parseFloat(data.large_exposure_limit),
      stress_test_scenarios: [] // Would be loaded separately
    };
  }

  async runLCRCalculation(orgId: string): Promise<LCRResult | null> {
    const portfolio = await this.loadLatestPortfolio(orgId);
    if (!portfolio) return null;

    // This would need funding profile data as well
    const fundingProfile: FundingProfile = {
      retail_deposits: 0,
      corporate_deposits: 0,
      wholesale_funding: 0,
      secured_funding: 0,
      stable_funding_ratio: 0,
      deposit_concentration: {}
    }; // Placeholder - would load from database

    const regulatoryParams = await this.getRegulatoryParameters('UK');
    if (!regulatoryParams) return null;

    const lcrCalc = new LiquidityCoverageRatioCalculator(
      portfolio.assets,
      fundingProfile,
      regulatoryParams
    );

    const result = lcrCalc.calculateLCR();

    // Save results
    await this.saveCalculationResult(
      orgId,
      'LCR',
      result,
      portfolio.snapshotId
    );

    return result;
  }
}

// Classes are already exported at their definitions above
// No need for duplicate exports
