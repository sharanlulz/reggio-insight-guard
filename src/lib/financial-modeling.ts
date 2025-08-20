// src/lib/financial-modeling.ts
// Financial modeling types and classes with proper exports

// Define core types first
export interface PortfolioAsset {
  id: string;
  assetClass: string;
  market_value: number;
  notional_value?: number;
  liquidity_classification: string;
  basel_risk_weight?: number;
  rating?: string;
  sector?: string;
  jurisdiction?: string;
}

export interface FundingProfile {
  retail_deposits: number;
  corporate_deposits: number;
  wholesale_funding: number;
  secured_funding: number;
  stable_funding_ratio?: number;
  deposit_concentration?: number;
}

export interface RegulatoryParameters {
  lcr_requirement?: number;
  tier1_minimum?: number;
  total_capital_minimum?: number;
  leverage_minimum?: number;
  jurisdiction?: string;
  applicable_date?: string;
  nsfr_requirement?: number;
  leverage_ratio_minimum?: number;
  large_exposure_limit?: number;
  stress_test_scenarios?: any[];
}

export interface CapitalBase {
  tier1_capital: number;
  tier2_capital: number;
}

export interface StressScenario {
  name: string;
  asset_shocks: Record<string, number>;
  funding_shocks: Record<string, number>;
  capital_base: CapitalBase;
}

export interface StressTestResult {
  scenario_name: string;
  lcr_result: LCRResult;
  capital_result: any;
  overall_assessment: any;
  recommendations: string[];
}

// Define missing LCRResult interface
export interface LCRResult {
  lcr_ratio: number;
  hqla_value: number;
  net_cash_outflows: number;
  requirement: number;
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT';
  buffer_or_deficit: number;
  breakdown: {
    level1_assets: number;
    level2a_assets: number;
    level2b_assets: number;
    retail_outflow_rate: number;
    corporate_outflow_rate: number;
    wholesale_outflow_rate: number;
  };
}

/**
 * FIXED Liquidity Coverage Ratio Calculator
 * Properly implements LCR calculation with correct outflow rates
 */
export class FixedLiquidityCoverageRatioCalculator {
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
    console.log('🔧 Running FIXED LCR calculation');
    
    const hqla = this.calculateHQLA();
    const netOutflows = this.calculateNetCashOutflows();
    
    console.log(`HQLA: £${(hqla / 1_000_000).toFixed(1)}M`);
    console.log(`Net Outflows: £${(netOutflows / 1_000_000).toFixed(1)}M`);
    
    const lcr = netOutflows > 0 ? hqla / netOutflows : 0;
    
    console.log(`LCR: ${(lcr * 100).toFixed(1)}%`);

    return {
      lcr_ratio: lcr,
      hqla_value: hqla,
      net_cash_outflows: netOutflows,
      requirement: this.parameters.lcr_requirement || 1.05,
      compliance_status: lcr >= (this.parameters.lcr_requirement || 1.05) ? 'COMPLIANT' : 'NON_COMPLIANT',
      buffer_or_deficit: hqla - (netOutflows * (this.parameters.lcr_requirement || 1.05)),
      breakdown: {
        level1_assets: this.getAssetValueByLevel('HQLA_L1'),
        level2a_assets: this.getAssetValueByLevel('HQLA_L2A') * 0.85, // After haircut
        level2b_assets: this.getAssetValueByLevel('HQLA_L2B') * 0.75, // After haircut
        retail_outflow_rate: 0.05, // 5% for stable retail deposits
        corporate_outflow_rate: 0.25, // 25% for operational corporate deposits
        wholesale_outflow_rate: 1.0 // 100% for wholesale funding
      }
    };
  }

  /**
   * Calculate High Quality Liquid Assets with proper haircuts
   */
  private calculateHQLA(): number {
    let hqla = 0;
    
    // Level 1 Assets (no haircut)
    const level1Value = this.getAssetValueByLevel('HQLA_L1');
    hqla += level1Value;
    
    // Level 2A Assets (15% haircut)
    const level2AValue = this.getAssetValueByLevel('HQLA_L2A');
    hqla += level2AValue * 0.85;
    
    // Level 2B Assets (25% haircut, subject to 40% cap)
    const level2BValue = this.getAssetValueByLevel('HQLA_L2B');
    const level2BAfterHaircut = level2BValue * 0.75;
    
    // Apply Level 2B cap (can't exceed 40% of total HQLA after haircuts)
    const totalLevel2 = (level2AValue * 0.85) + level2BAfterHaircut;
    const maxLevel2B = (level1Value + totalLevel2) * 0.4;
    
    const finalLevel2B = Math.min(level2BAfterHaircut, maxLevel2B);
    hqla = level1Value + (level2AValue * 0.85) + finalLevel2B;
    
    return hqla;
  }

  /**
   * Calculate Net Cash Outflows with PROPER Basel III rates
   */
  private calculateNetCashOutflows(): number {
    // FIXED: Proper outflow rates based on Basel III LCR framework
    
    // Retail deposits (5% for stable, 10% for less stable)
    const retailOutflows = this.funding.retail_deposits * 0.05;
    
    // Corporate deposits (25% for operational, 40% for non-operational)
    const corporateOutflows = this.funding.corporate_deposits * 0.25;
    
    // Wholesale funding (100% outflow rate)
    const wholesaleOutflows = this.funding.wholesale_funding * 1.0;
    
    // Secured funding typically has lower outflow rates
    const securedOutflows = this.funding.secured_funding * 0.25;
    
    const totalOutflows = retailOutflows + corporateOutflows + wholesaleOutflows + securedOutflows;
    
    // In a real implementation, you'd also calculate inflows and apply the 75% cap
    // For now, we assume minimal inflows
    const totalInflows = 0;
    const cappedInflows = Math.min(totalInflows, totalOutflows * 0.75);
    
    const netOutflows = Math.max(totalOutflows - cappedInflows, totalOutflows * 0.25); // Minimum 25% of gross outflows
    
    return netOutflows;
  }

  /**
   * Get total asset value by liquidity classification
   */
  private getAssetValueByLevel(level: string): number {
    return this.assets
      .filter(asset => asset.liquidity_classification === level)
      .reduce((sum, asset) => sum + asset.market_value, 0);
  }
}

/**
 * FIXED Stress Testing Engine that uses the corrected LCR calculator
 */
export class FixedStressTestingEngine {
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

  runStressScenario(scenario: any): any {
    console.log(`🧪 Running FIXED stress scenario: ${scenario.name}`);
    
    // Apply stress shocks to portfolio
    const stressedAssets = this.applyAssetShocks(scenario.asset_shocks);
    const stressedFunding = this.applyFundingShocks(scenario.funding_shocks);

    // Use FIXED LCR calculator
    const lcrCalc = new FixedLiquidityCoverageRatioCalculator(
      stressedAssets, 
      stressedFunding, 
      this.parameters
    );
    const lcrResult = lcrCalc.calculateLCR();

    // Calculate stressed capital (simplified for now)
    const capitalResult = this.calculateStressedCapital(stressedAssets, scenario.capital_base);

    console.log(`📊 ${scenario.name} results: LCR ${(lcrResult.lcr_ratio * 100).toFixed(1)}%, Tier1 ${(capitalResult.tier1_capital_ratio * 100).toFixed(1)}%`);

    return {
      scenario_name: scenario.name,
      lcr_result: lcrResult,
      capital_result: capitalResult,
      overall_assessment: this.assessOverallRisk(lcrResult, capitalResult),
      recommendations: this.generateRecommendations(lcrResult, capitalResult)
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
      wholesale_funding: this.baseFunding.wholesale_funding * (1 + (shocks['WHOLESALE_FUNDING'] || 0)),
      secured_funding: this.baseFunding.secured_funding * (1 + (shocks['SECURED_FUNDING'] || 0))
    };
  }

  private calculateStressedCapital(assets: PortfolioAsset[], capitalBase: any) {
    // Calculate RWA
    const rwa = assets.reduce((total, asset) => {
      return total + (asset.market_value * (asset.basel_risk_weight || 1.0));
    }, 0);

    // Calculate credit losses (simplified)
    const creditLosses = this.calculateCreditLosses(assets);
    
    // Stressed capital
    const stressedTier1 = capitalBase.tier1_capital - creditLosses;
    const stressedTotal = stressedTier1 + capitalBase.tier2_capital;
    
    const tier1Ratio = rwa > 0 ? stressedTier1 / rwa : 0;
    const totalRatio = rwa > 0 ? stressedTotal / rwa : 0;
    const totalExposure = assets.reduce((sum, asset) => sum + asset.market_value, 0);
    const leverageRatio = totalExposure > 0 ? stressedTier1 / totalExposure : 0;

    return {
      risk_weighted_assets: rwa,
      tier1_capital_ratio: tier1Ratio,
      total_capital_ratio: totalRatio,
      leverage_ratio: leverageRatio,
      capital_requirements: {
        tier1_minimum: rwa * 0.06,
        total_capital_minimum: rwa * 0.08,
        leverage_minimum: totalExposure * 0.03
      },
      compliance_status: {
        tier1_compliant: tier1Ratio >= 0.06,
        total_capital_compliant: totalRatio >= 0.08,
        leverage_compliant: leverageRatio >= 0.03
      },
      buffers_and_surcharges: {
        capital_conservation_buffer: rwa * 0.025,
        countercyclical_buffer: rwa * 0.01,
        systemic_risk_buffer: rwa * 0.005,
        total_buffer_requirement: rwa * 0.04
      },
      large_exposures: []
    };
  }

  private calculateCreditLosses(assets: PortfolioAsset[]): number {
    let totalLosses = 0;
    
    assets.forEach(asset => {
      if (asset.assetClass === 'CORPORATE' || asset.assetClass === 'PROPERTY') {
        let lossRate = 0;
        
        if (asset.assetClass === 'CORPORATE') {
          switch (asset.rating) {
            case 'AAA': case 'AA': lossRate = 0.02; break;
            case 'A': lossRate = 0.04; break;
            case 'BBB': lossRate = 0.08; break;
            case 'BB': lossRate = 0.15; break;
            default: lossRate = 0.20; break;
          }
        } else if (asset.assetClass === 'PROPERTY') {
          lossRate = asset.sector === 'Residential' ? 0.05 : 0.12;
        }
        
        totalLosses += asset.market_value * lossRate;
      }
    });
    
    return totalLosses;
  }

  private assessOverallRisk(lcr: LCRResult, capital: any) {
    const risks: string[] = [];
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    if (lcr.compliance_status === 'NON_COMPLIANT') {
      risks.push('LCR below regulatory requirement');
      severity = 'HIGH';
    }

    if (!capital.compliance_status.tier1_compliant) {
      risks.push('Tier 1 capital below minimum');
      severity = 'HIGH';
    }

    if (lcr.lcr_ratio < 1.10 && lcr.lcr_ratio >= 1.05) {
      risks.push('LCR buffer reduced but compliant');
      severity = severity === 'HIGH' ? 'HIGH' : 'MEDIUM';
    }

    if (risks.length === 0) {
      risks.push('Stress impact within acceptable ranges');
    }

    return {
      overall_severity: severity,
      risk_factors: risks,
      confidence_level: 0.85
    };
  }

  private generateRecommendations(lcr: LCRResult, capital: any): string[] {
    const recommendations: string[] = [];

    if (lcr.compliance_status === 'NON_COMPLIANT') {
      const shortfall = Math.abs(lcr.buffer_or_deficit) / 1_000_000;
      recommendations.push(`Increase HQLA by £${shortfall.toFixed(0)}M to meet LCR requirements`);
    }

    if (!capital.compliance_status.tier1_compliant) {
      const shortfall = (0.06 - capital.tier1_capital_ratio) * capital.risk_weighted_assets / 1_000_000;
      recommendations.push(`Raise £${shortfall.toFixed(0)}M in Tier 1 capital`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current risk management framework');
      recommendations.push('Monitor for early warning indicators');
    }

    return recommendations;
  }
}

// Create a simple CapitalAdequacyCalculator for compatibility
export class CapitalAdequacyCalculator {
  private parameters: RegulatoryParameters;
  private financialEngine?: any;

  constructor(parameters: RegulatoryParameters, financialEngine?: any) {
    this.parameters = parameters;
    this.financialEngine = financialEngine;
  }

  calculateCapitalRatios(assets: PortfolioAsset[], capitalBase: CapitalBase) {
    const rwa = assets.reduce((total, asset) => {
      return total + (asset.market_value * (asset.basel_risk_weight || 1.0));
    }, 0);

    const tier1Ratio = rwa > 0 ? capitalBase.tier1_capital / rwa : 0;
    const totalRatio = rwa > 0 ? (capitalBase.tier1_capital + capitalBase.tier2_capital) / rwa : 0;

    return {
      risk_weighted_assets: rwa,
      tier1_capital_ratio: tier1Ratio,
      total_capital_ratio: totalRatio,
      compliance_status: {
        tier1_compliant: tier1Ratio >= (this.parameters.tier1_minimum || 0.06),
        total_capital_compliant: totalRatio >= (this.parameters.total_capital_minimum || 0.08)
      }
    };
  }

  calculate(assets: PortfolioAsset[], capitalBase: CapitalBase) {
    return this.calculateCapitalRatios(assets, capitalBase);
  }
}

// Export RegulatoryImpactAnalyzer
export { RegulatoryImpactAnalyzer } from './regulatory-impact-analyzer';

// Export the fixed classes with proper names
export {
  FixedLiquidityCoverageRatioCalculator as LiquidityCoverageRatioCalculator,
  FixedStressTestingEngine as StressTestingEngine
};
