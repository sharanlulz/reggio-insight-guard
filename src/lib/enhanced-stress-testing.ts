// Enhanced Stress Testing & Portfolio Impact Modeling
// Connects regulatory intelligence to real financial scenarios
// File: src/lib/enhanced-stress-testing.ts

import { 
  PortfolioAsset, 
  FundingProfile, 
  RegulatoryParameters,
  LiquidityCoverageRatioCalculator,
  CapitalAdequacyCalculator,
  StressTestingEngine
} from './financial-modeling';

// ============================================================================
// REAL-WORLD STRESS SCENARIOS
// ============================================================================

export interface RealWorldStressScenario {
  id: string;
  name: string;
  description: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'EXTREME';
  regulatoryBasis: string; // Which regulation mandates this test
  macroeconomicShocks: {
    gdpChange: number;
    unemploymentChange: number;
    interestRateChange: number;
    inflationChange: number;
    currencyVolatility: number;
  };
  assetClassShocks: {
    sovereign: number;
    corporate: number;
    equity: number;
    property: number;
    cash: number;
  };
  fundingShocks: {
    retailDepositOutflow: number;
    corporateDepositOutflow: number;
    wholesaleFundingAvailability: number;
    securedFundingHaircut: number;
  };
  creditShocks: {
    defaultRateIncrease: number;
    ratingDowngrades: Record<string, string>; // From->To rating
    lossGivenDefaultIncrease: number;
  };
}

// Bank of England 2024 Annual Cyclical Scenario (ACS)
export const BOE_2024_ACS: RealWorldStressScenario = {
  id: 'boe-2024-acs',
  name: 'Bank of England 2024 Annual Cyclical Scenario',
  description: 'Severe but plausible recession with UK GDP falling 5% and unemployment rising to 8.5%',
  severity: 'SEVERE',
  regulatoryBasis: 'PRA Supervisory Statement SS31/15 - Bank Stress Testing',
  macroeconomicShocks: {
    gdpChange: -0.05, // 5% GDP decline
    unemploymentChange: 0.035, // From 4% to 8.5%
    interestRateChange: -0.015, // Base rate falls 150bps
    inflationChange: -0.02, // Deflationary pressure
    currencyVolatility: 0.15 // 15% GBP volatility
  },
  assetClassShocks: {
    sovereign: -0.02, // Limited sovereign stress
    corporate: -0.18, // 18% corporate bond decline
    equity: -0.35, // 35% equity market decline
    property: -0.28, // 28% property value decline
    cash: 0.0 // Cash protected
  },
  fundingShocks: {
    retailDepositOutflow: -0.08, // 8% retail deposit outflow
    corporateDepositOutflow: -0.25, // 25% corporate deposit flight
    wholesaleFundingAvailability: -0.40, // 40% wholesale funding reduction
    securedFundingHaircut: 0.15 // 15% additional haircut on collateral
  },
  creditShocks: {
    defaultRateIncrease: 2.5, // 250bps increase in default rates
    ratingDowngrades: {
      'AAA': 'AA+',
      'AA+': 'AA',
      'AA': 'AA-',
      'AA-': 'A+',
      'A+': 'A',
      'A': 'A-',
      'BBB+': 'BBB',
      'BBB': 'BBB-'
    },
    lossGivenDefaultIncrease: 0.10 // 10pp increase in LGD
  }
};

// ECB 2024 Stress Test Scenario
export const ECB_2024_STRESS: RealWorldStressScenario = {
  id: 'ecb-2024-stress',
  name: 'ECB 2024 EU-Wide Stress Test',
  description: 'Adverse scenario with stagflation, geopolitical tensions, and financial market disruption',
  severity: 'SEVERE',
  regulatoryBasis: 'EBA Guidelines EBA/GL/2018/04 - Stress Testing',
  macroeconomicShocks: {
    gdpChange: -0.044, // 4.4% EU GDP decline
    unemploymentChange: 0.027, // Unemployment rises 270bps
    interestRateChange: 0.025, // Interest rates rise despite recession
    inflationChange: 0.035, // Stagflationary pressure
    currencyVolatility: 0.12
  },
  assetClassShocks: {
    sovereign: -0.08, // Sovereign stress due to fiscal concerns
    corporate: -0.22, // Severe corporate stress
    equity: -0.45, // Major equity decline
    property: -0.31, // Property market stress
    cash: -0.005 // Negative rates impact
  },
  fundingShocks: {
    retailDepositOutflow: -0.06,
    corporateDepositOutflow: -0.30,
    wholesaleFundingAvailability: -0.50,
    securedFundingHaircut: 0.20
  },
  creditShocks: {
    defaultRateIncrease: 3.2,
    ratingDowngrades: {
      'AAA': 'AA',
      'AA': 'A+',
      'A': 'BBB+',
      'BBB': 'BB+'
    },
    lossGivenDefaultIncrease: 0.15
  }
};

// Fed 2024 CCAR Severely Adverse Scenario
export const FED_2024_CCAR: RealWorldStressScenario = {
  id: 'fed-2024-ccar',
  name: 'Federal Reserve 2024 CCAR Severely Adverse',
  description: 'Severe global recession with US unemployment reaching 10% and equity markets falling 45%',
  severity: 'EXTREME',
  regulatoryBasis: 'Federal Reserve CCAR 2024 - Comprehensive Capital Analysis and Review',
  macroeconomicShocks: {
    gdpChange: -0.063, // 6.3% US GDP decline
    unemploymentChange: 0.063, // From 3.7% to 10%
    interestRateChange: -0.035, // Fed cuts rates to zero
    inflationChange: -0.015, // Deflationary spiral
    currencyVolatility: 0.18
  },
  assetClassShocks: {
    sovereign: 0.02, // Flight to quality benefits Treasuries
    corporate: -0.26, // Severe corporate stress
    equity: -0.45, // 45% equity decline
    property: -0.35, // Major property correction
    cash: 0.0
  },
  fundingShocks: {
    retailDepositOutflow: -0.10,
    corporateDepositOutflow: -0.35,
    wholesaleFundingAvailability: -0.60,
    securedFundingHaircut: 0.25
  },
  creditShocks: {
    defaultRateIncrease: 4.0, // 400bps increase
    ratingDowngrades: {
      'AAA': 'A+',
      'AA': 'BBB+',
      'A': 'BB+',
      'BBB': 'B+'
    },
    lossGivenDefaultIncrease: 0.20
  }
};

// Custom Basel III Implementation Scenario
export const BASEL_III_IMPLEMENTATION: RealWorldStressScenario = {
  id: 'basel-iii-implementation',
  name: 'Basel III Final Implementation Stress',
  description: 'Impact of full Basel III implementation with higher capital requirements and FRTB',
  severity: 'MODERATE',
  regulatoryBasis: 'Basel III Final Rule - BIS BCBS 424',
  macroeconomicShocks: {
    gdpChange: -0.02, // Mild recession from regulatory tightening
    unemploymentChange: 0.015,
    interestRateChange: 0.01,
    inflationChange: 0.005,
    currencyVolatility: 0.08
  },
  assetClassShocks: {
    sovereign: 0.01, // Slight benefit from higher quality requirements
    corporate: -0.08, // Corporate credit tightening
    equity: -0.15, // Market adjustment
    property: -0.10, // Reduced leverage impact
    cash: 0.0
  },
  fundingShocks: {
    retailDepositOutflow: -0.03,
    corporateDepositOutflow: -0.10,
    wholesaleFundingAvailability: -0.20,
    securedFundingHaircut: 0.05
  },
  creditShocks: {
    defaultRateIncrease: 0.5, // 50bps increase
    ratingDowngrades: {
      'BBB-': 'BB+'
    },
    lossGivenDefaultIncrease: 0.05
  }
};

// ============================================================================
// ENHANCED STRESS TESTING ENGINE
// ============================================================================

export class EnhancedStressTestingEngine {
  private baseAssets: PortfolioAsset[];
  private baseFunding: FundingProfile;
  private parameters: RegulatoryParameters;
  private scenarios: RealWorldStressScenario[];

  constructor(
    assets: PortfolioAsset[],
    funding: FundingProfile,
    parameters: RegulatoryParameters
  ) {
    this.baseAssets = assets;
    this.baseFunding = funding;
    this.parameters = parameters;
    this.scenarios = [BOE_2024_ACS, ECB_2024_STRESS, FED_2024_CCAR, BASEL_III_IMPLEMENTATION];
  }

  runRegulatoryStressTest(scenarioId: string): DetailedStressResult {
    const scenario = this.scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    // Apply comprehensive stress shocks
    const stressedAssets = this.applyComprehensiveAssetShocks(scenario);
    const stressedFunding = this.applyComprehensiveFundingShocks(scenario);
    const stressedCapital = this.applyCapitalStress(scenario);

    // Recalculate all metrics under stress
    const lcrCalculator = new LiquidityCoverageRatioCalculator(
      stressedAssets,
      stressedFunding,
      this.parameters
    );

    const capitalCalculator = new CapitalAdequacyCalculator(
      stressedAssets,
      this.parameters
    );

    const lcrResult = lcrCalculator.calculateLCR();
    const capitalResult = capitalCalculator.calculateCapitalRatios(stressedCapital);

    // Calculate business impact
    const businessImpact = this.calculateBusinessImpact(scenario, lcrResult, capitalResult);
    
    // Generate regulatory actions required
    const regulatoryActions = this.generateRegulatoryActions(lcrResult, capitalResult, scenario);

    return {
      scenario: scenario,
      timestamp: new Date().toISOString(),
      baseline: {
        lcr: new LiquidityCoverageRatioCalculator(this.baseAssets, this.baseFunding, this.parameters).calculateLCR(),
        capital: new CapitalAdequacyCalculator(this.baseAssets, this.parameters).calculateCapitalRatios(stressedCapital)
      },
      stressed: {
        lcr: lcrResult,
        capital: capitalResult,
        assets: stressedAssets,
        funding: stressedFunding
      },
      impact: businessImpact,
      actions: regulatoryActions,
      passStatus: this.determinePassStatus(lcrResult, capitalResult, scenario)
    };
  }

  runMultiJurisdictionStress(): MultiJurisdictionStressResult {
    const results = this.scenarios.map(scenario => this.runRegulatoryStressTest(scenario.id));
    
    return {
      individual_results: results,
      cross_jurisdiction_analysis: this.analyzeCrossJurisdictionImpact(results),
      worst_case_scenario: this.identifyWorstCaseScenario(results),
      capital_planning_recommendations: this.generateCapitalPlanningRecommendations(results),
      regulatory_capital_optimization: this.optimizeRegulatoryCapital(results)
    };
  }

  // ============================================================================
  // PORTFOLIO IMPACT MODELING
  // ============================================================================

  analyzePortfolioRegulatoryImpact(
    regulationChanges: RegulatoryChangeSet[]
  ): PortfolioImpactAnalysis {
    const impacts: RegulationImpact[] = [];

    for (const change of regulationChanges) {
      const baselineMetrics = this.calculateCurrentMetrics();
      const newParameters = this.applyRegulatoryChange(change);
      const projectedMetrics = this.calculateMetricsWithNewParameters(newParameters);

      impacts.push({
        regulation: change,
        financial_impact: {
          lcr_change: projectedMetrics.lcr - baselineMetrics.lcr,
          tier1_change: projectedMetrics.tier1 - baselineMetrics.tier1,
          leverage_change: projectedMetrics.leverage - baselineMetrics.leverage,
          additional_capital_required: this.calculateAdditionalCapitalRequired(
            baselineMetrics,
            projectedMetrics
          ),
          liquidity_buffer_impact: this.calculateLiquidityBufferImpact(
            baselineMetrics,
            projectedMetrics
          )
        },
        operational_impact: this.assessOperationalImpact(change),
        timeline: change.implementation_timeline,
        confidence: this.calculateConfidence(change)
      });
    }

    return {
      total_capital_impact: impacts.reduce((sum, i) => sum + i.financial_impact.additional_capital_required, 0),
      total_liquidity_impact: impacts.reduce((sum, i) => sum + i.financial_impact.liquidity_buffer_impact, 0),
      regulation_impacts: impacts,
      priority_actions: this.prioritizeActions(impacts),
      implementation_roadmap: this.generateImplementationRoadmap(impacts)
    };
  }

  // ============================================================================
  // BUSINESS IMPACT CALCULATIONS
  // ============================================================================

  private calculateBusinessImpact(
    scenario: RealWorldStressScenario,
    lcrResult: any,
    capitalResult: any
  ): BusinessImpact {
    // Calculate lending capacity impact
    const currentRWA = this.baseAssets.reduce((sum, asset) => 
      sum + (asset.market_value * (asset.basel_risk_weight || 1)), 0
    );
    
    const newCapitalConstraint = capitalResult.tier1_capital_ratio < this.parameters.tier1_minimum;
    const newLiquidityConstraint = lcrResult.lcr_ratio < this.parameters.lcr_requirement;

    const lendingCapacityReduction = this.calculateLendingCapacityReduction(
      newCapitalConstraint,
      newLiquidityConstraint,
      capitalResult,
      lcrResult
    );

    // Calculate P&L impact
    const creditLossImpact = this.calculateCreditLossImpact(scenario);
    const tradingLossImpact = this.calculateTradingLossImpact(scenario);
    const fundingCostIncrease = this.calculateFundingCostIncrease(scenario);

    return {
      lending_capacity_reduction: lendingCapacityReduction,
      estimated_pl_impact: {
        credit_losses: creditLossImpact,
        trading_losses: tradingLossImpact,
        increased_funding_costs: fundingCostIncrease,
        total_impact: creditLossImpact + tradingLossImpact + fundingCostIncrease
      },
      capital_actions_required: {
        immediate_capital_raise: newCapitalConstraint ? this.calculateCapitalShortfall(capitalResult) : 0,
        liquidity_increase: newLiquidityConstraint ? this.calculateLiquidityShortfall(lcrResult) : 0,
        asset_sales_required: this.calculateAssetSalesRequired(capitalResult, lcrResult),
        cost_reduction_target: this.calculateCostReductionTarget(scenario)
      },
      timeline_to_compliance: this.estimateTimelineToCompliance(capitalResult, lcrResult),
      management_actions: this.generateManagementActions(scenario, capitalResult, lcrResult)
    };
  }

  private calculateLendingCapacityReduction(
    capitalConstrained: boolean,
    liquidityConstrained: boolean,
    capitalResult: any,
    lcrResult: any
  ): number {
    if (!capitalConstrained && !liquidityConstrained) return 0;

    let reduction = 0;

    if (capitalConstrained) {
      const capitalShortfall = this.calculateCapitalShortfall(capitalResult);
      // Each £1M capital supports ~£12.5M lending (8% capital ratio)
      reduction += capitalShortfall * 12.5;
    }

    if (liquidityConstrained) {
      const liquidityShortfall = this.calculateLiquidityShortfall(lcrResult);
      // Each £1M HQLA supports ~£4M lending capacity
      reduction += liquidityShortfall * 4;
    }

    return Math.max(reduction, 0);
  }

  private generateManagementActions(
    scenario: RealWorldStressScenario,
    capitalResult: any,
    lcrResult: any
  ): ManagementAction[] {
    const actions: ManagementAction[] = [];

    // Capital actions
    if (capitalResult.tier1_capital_ratio < this.parameters.tier1_minimum) {
      actions.push({
        category: 'CAPITAL',
        action: 'Immediate capital raise',
        amount: this.calculateCapitalShortfall(capitalResult),
        timeline: 'Immediate',
        priority: 'CRITICAL'
      });
    }

    // Liquidity actions
    if (lcrResult.lcr_ratio < this.parameters.lcr_requirement) {
      actions.push({
        category: 'LIQUIDITY',
        action: 'Increase HQLA holdings',
        amount: this.calculateLiquidityShortfall(lcrResult),
        timeline: '30 days',
        priority: 'HIGH'
      });
    }

    // Asset quality actions
    actions.push({
      category: 'ASSET_QUALITY',
      action: 'Enhanced credit monitoring',
      amount: 0,
      timeline: 'Immediate',
      priority: 'MEDIUM'
    });

    // Cost management
    if (scenario.severity === 'SEVERE' || scenario.severity === 'EXTREME') {
      actions.push({
        category: 'COST_MANAGEMENT',
        action: 'Reduce operating expenses',
        amount: this.calculateCostReductionTarget(scenario),
        timeline: '6 months',
        priority: 'HIGH'
      });
    }

    return actions;
  }

  // Helper calculation methods
  private calculateCapitalShortfall(capitalResult: any): number {
    if (capitalResult.tier1_capital_ratio >= this.parameters.tier1_minimum) return 0;
    
    const requiredCapital = capitalResult.risk_weighted_assets * this.parameters.tier1_minimum;
    const currentCapital = capitalResult.risk_weighted_assets * capitalResult.tier1_capital_ratio;
    return Math.max(0, requiredCapital - currentCapital);
  }

  private calculateLiquidityShortfall(lcrResult: any): number {
    if (lcrResult.lcr_ratio >= this.parameters.lcr_requirement) return 0;
    
    const requiredHQLA = lcrResult.net_cash_outflows * this.parameters.lcr_requirement;
    return Math.max(0, requiredHQLA - lcrResult.total_hqla);
  }

  private calculateCostReductionTarget(scenario: RealWorldStressScenario): number {
    // Estimate cost reduction needed based on scenario severity
    const baseCosts = 100_000_000; // £100M annual costs
    
    switch (scenario.severity) {
      case 'EXTREME': return baseCosts * 0.25; // 25% cost reduction
      case 'SEVERE': return baseCosts * 0.15;  // 15% cost reduction
      case 'MODERATE': return baseCosts * 0.10; // 10% cost reduction
      default: return baseCosts * 0.05;        // 5% cost reduction
    }
  }

  // Additional helper methods for comprehensive stress testing
  private applyComprehensiveAssetShocks(scenario: RealWorldStressScenario): PortfolioAsset[] {
    return this.baseAssets.map(asset => ({
      ...asset,
      market_value: asset.market_value * (1 + (scenario.assetClassShocks[asset.assetClass.toLowerCase()] || 0))
    }));
  }

  private applyComprehensiveFundingShocks(scenario: RealWorldStressScenario): FundingProfile {
    return {
      ...this.baseFunding,
      retail_deposits: this.baseFunding.retail_deposits * (1 + scenario.fundingShocks.retailDepositOutflow),
      corporate_deposits: this.baseFunding.corporate_deposits * (1 + scenario.fundingShocks.corporateDepositOutflow),
      wholesale_funding: this.baseFunding.wholesale_funding * (1 + scenario.fundingShocks.wholesaleFundingAvailability)
    };
  }

  private applyCapitalStress(scenario: RealWorldStressScenario): any {
    // Apply credit losses to capital base
    const creditLosses = this.calculateCreditLossImpact(scenario);
    
    return {
      tier1_capital: Math.max(0, 50_000_000 - creditLosses), // Base £50M minus losses
      tier2_capital: 10_000_000 // Assume stable
    };
  }

  private calculateCreditLossImpact(scenario: RealWorldStressScenario): number {
    const totalExposure = this.baseAssets
      .filter(asset => asset.assetClass === 'CORPORATE')
      .reduce((sum, asset) => sum + asset.market_value, 0);
    
    // Apply scenario-specific default rate increase
    return totalExposure * scenario.creditShocks.defaultRateIncrease / 100;
  }

  private calculateTradingLossImpact(scenario: RealWorldStressScenario): number {
    const tradingAssets = this.baseAssets
      .filter(asset => asset.assetClass === 'EQUITY')
      .reduce((sum, asset) => sum + asset.market_value, 0);
    
    return tradingAssets * Math.abs(scenario.assetClassShocks.equity);
  }

  private calculateFundingCostIncrease(scenario: RealWorldStressScenario): number {
    const totalFunding = this.baseFunding.retail_deposits + 
                        this.baseFunding.corporate_deposits + 
                        this.baseFunding.wholesale_funding;
    
    // Estimate 200bps funding cost increase in severe stress
    const costIncrease = scenario.severity === 'EXTREME' ? 0.03 : 
                        scenario.severity === 'SEVERE' ? 0.02 : 0.01;
    
    return totalFunding * costIncrease;
  }

  private determinePassStatus(lcrResult: any, capitalResult: any, scenario: RealWorldStressScenario): StressTestPassStatus {
    const lcrPassed = lcrResult.lcr_ratio >= this.parameters.lcr_requirement;
    const capitalPassed = capitalResult.tier1_capital_ratio >= this.parameters.tier1_minimum;
    
    return {
      overall_pass: lcrPassed && capitalPassed,
      lcr_pass: lcrPassed,
      capital_pass: capitalPassed,
      scenario_severity: scenario.severity,
      regulatory_basis: scenario.regulatoryBasis,
      actions_required: !lcrPassed || !capitalPassed
    };
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DetailedStressResult {
  scenario: RealWorldStressScenario;
  timestamp: string;
  baseline: {
    lcr: any;
    capital: any;
  };
  stressed: {
    lcr: any;
    capital: any;
    assets: PortfolioAsset[];
    funding: FundingProfile;
  };
  impact: BusinessImpact;
  actions: ManagementAction[];
  passStatus: StressTestPassStatus;
}

interface BusinessImpact {
  lending_capacity_reduction: number;
  estimated_pl_impact: {
    credit_losses: number;
    trading_losses: number;
    increased_funding_costs: number;
    total_impact: number;
  };
  capital_actions_required: {
    immediate_capital_raise: number;
    liquidity_increase: number;
    asset_sales_required: number;
    cost_reduction_target: number;
  };
  timeline_to_compliance: string;
  management_actions: ManagementAction[];
}

interface ManagementAction {
  category: 'CAPITAL' | 'LIQUIDITY' | 'ASSET_QUALITY' | 'COST_MANAGEMENT';
  action: string;
  amount: number;
  timeline: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface StressTestPassStatus {
  overall_pass: boolean;
  lcr_pass: boolean;
  capital_pass: boolean;
  scenario_severity: string;
  regulatory_basis: string;
  actions_required: boolean;
}

interface MultiJurisdictionStressResult {
  individual_results: DetailedStressResult[];
  cross_jurisdiction_analysis: any;
  worst_case_scenario: DetailedStressResult;
  capital_planning_recommendations: string[];
  regulatory_capital_optimization: any;
}

interface RegulatoryChangeSet {
  regulation_name: string;
  jurisdiction: string;
  parameter_changes: Record<string, number>;
  implementation_timeline: string;
  mandatory: boolean;
}

interface PortfolioImpactAnalysis {
  total_capital_impact: number;
  total_liquidity_impact: number;
  regulation_impacts: RegulationImpact[];
  priority_actions: string[];
  implementation_roadmap: any;
}

interface RegulationImpact {
  regulation: RegulatoryChangeSet;
  financial_impact: {
    lcr_change: number;
    tier1_change: number;
    leverage_change: number;
    additional_capital_required: number;
    liquidity_buffer_impact: number;
  };
  operational_impact: string[];
  timeline: string;
  confidence: number;
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
// Initialize enhanced stress testing
const enhancedStressEngine = new EnhancedStressTestingEngine(
  customerPortfolio,
  customerFunding,
  ukRegulatoryParameters
);

// Run Bank of England stress test
const boeStressResult = enhancedStressEngine.runRegulatoryStressTest('boe-2024-acs');

console.log('BOE Stress Test Results:');
console.log(`LCR Pass: ${boeStressResult.passStatus.lcr_pass}`);
console.log(`Capital Pass: ${boeStressResult.passStatus.capital_pass}`);
console.log(`Lending Capacity Reduction: £${boeStressResult.impact.lending_capacity_reduction.toFixed(0)}M`);
console.log(`Total P&L Impact: £${boeStressResult.impact.estimated_pl_impact.total_impact.toFixed(0)}M`);

// Run multi-jurisdiction analysis
const multiJurisdictionResult = enhancedStressEngine.runMultiJurisdictionStress();

// Analyze specific regulatory changes
const regulatoryChanges: RegulatoryChangeSet[] = [
  {
    regulation_name: 'Basel III Final Implementation',
    jurisdiction: 'UK',
    parameter_changes: {
      'tier1_minimum': 0.07, // Increase from 6% to 7%
      'lcr_requirement': 1.05 // Increase from 100% to 105%
    },
    implementation_timeline: '2025-01-01',
    mandatory: true
  }
];

const portfolioImpact = enhancedStressEngine.analyzePortfolioRegulatoryImpact(regulatoryChanges);
*/
