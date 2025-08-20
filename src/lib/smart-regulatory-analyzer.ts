import { 
  LiquidityCoverageRatioCalculator,
  CapitalAdequacyCalculator,
  RegulatoryImpactAnalyzer,
  type PortfolioAsset,
  type FundingProfile,
  type RegulatoryParameters,
  type CapitalBase
} from './financial-modeling';

// Enhanced AI Analysis Types
export interface FinancialImpactClause {
  clause_id: string;
  clause_text: string;
  path_hierarchy: string;
  
  // Existing fields (from your current analysis)
  summary_plain: string;
  obligation_type: string;
  risk_area: string;
  themes: string[];
  
  // NEW: Financial impact analysis
  financial_impact_type: 'CAPITAL_REQUIREMENT' | 'LIQUIDITY_REQUIREMENT' | 'OPERATIONAL_COST' | 'REPORTING_COST' | 'CONSTRAINT' | 'NONE';
  quantitative_impact: {
    impact_metric: 'LCR_MINIMUM' | 'TIER1_MINIMUM' | 'LEVERAGE_MINIMUM' | 'RWA_MULTIPLIER' | 'COST_PER_ANNUM' | 'BUFFER_REQUIREMENT';
    impact_value: number; // e.g., 0.10 for 10% requirement, or 50000000 for £50M cost
    confidence_score: number; // 0-1, how confident AI is in the analysis
    effective_date?: string;
    sunset_date?: string;
  } | null;
  
  // Impact calculation results
  calculated_impact?: {
    current_compliance_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'AT_RISK';
    financial_shortfall_or_surplus: number; // £ amount
    annual_cost_estimate: number; // £ per year
    recommended_actions: string[];
  };
}

export interface RegulatoryChangeEvent {
  id: string;
  regulation_id: string;
  regulation_title: string;
  change_type: 'NEW_REGULATION' | 'AMENDMENT' | 'REPEAL' | 'GUIDANCE_UPDATE';
  change_date: string;
  effective_date: string;
  affected_clauses: FinancialImpactClause[];
  
  // Aggregated impact across all clauses
  total_financial_impact: {
    capital_impact: number; // £ additional capital required
    liquidity_impact: number; // £ additional liquidity required
    operational_cost_impact: number; // £ per year additional costs
    total_one_time_cost: number;
    total_annual_cost: number;
  };
  
  // Strategic analysis
  strategic_assessment: {
    overall_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    implementation_complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'MAJOR_TRANSFORMATION';
    recommended_timeline: string; // e.g., "6 months", "18 months"
    key_risks: string[];
    opportunities: string[];
  };
}

// Enhanced AI Analysis Service
export class SmartRegulatoryAnalyzer {
  private groqApiKey: string;
  private financialEngine: any; // Your existing financial modeling engine

  constructor(groqApiKey: string, financialEngine: any) {
    this.groqApiKey = groqApiKey;
    this.financialEngine = financialEngine;
  }

  // Enhanced AI prompt for financial impact analysis
  private getFinancialImpactPrompt(): string {
    return `
You are an expert regulatory analyst specializing in quantitative financial impact assessment for banks.

Analyze the provided regulatory clause and identify specific financial impacts. Return ONLY valid JSON.

For each clause, determine:

1. FINANCIAL_IMPACT_TYPE (exactly one):
   - CAPITAL_REQUIREMENT: Affects capital ratios, RWA, or capital buffers
   - LIQUIDITY_REQUIREMENT: Affects LCR, NSFR, or liquidity buffers  
   - OPERATIONAL_COST: Creates ongoing operational expenses
   - REPORTING_COST: Creates reporting/compliance costs
   - CONSTRAINT: Limits business activities or investments
   - NONE: No direct financial impact

2. QUANTITATIVE_IMPACT (if financial impact exists):
   - impact_metric: LCR_MINIMUM | TIER1_MINIMUM | LEVERAGE_MINIMUM | RWA_MULTIPLIER | COST_PER_ANNUM | BUFFER_REQUIREMENT
   - impact_value: Numerical value (use decimals for percentages, e.g., 0.10 for 10%)
   - confidence_score: 0.0 to 1.0 based on clarity of requirement
   - effective_date: "YYYY-MM-DD" if specified
   - sunset_date: "YYYY-MM-DD" if temporary

3. EXAMPLES:
   - "LCR must be at least 100%" → impact_metric: "LCR_MINIMUM", impact_value: 1.0
   - "Tier 1 capital ratio minimum 8%" → impact_metric: "TIER1_MINIMUM", impact_value: 0.08
   - "Annual stress testing costs" → impact_metric: "COST_PER_ANNUM", impact_value: 2000000
   - "Additional buffer of 2%" → impact_metric: "BUFFER_REQUIREMENT", impact_value: 0.02

4. CONFIDENCE SCORING:
   - 1.0: Explicit numerical requirement clearly stated
   - 0.8: Clear requirement, some interpretation needed
   - 0.6: Implied requirement, moderate uncertainty
   - 0.4: Vague requirement, high uncertainty
   - 0.2: Minimal financial impact, very uncertain

Return JSON with this exact structure:
{
  "financial_impact_type": "CAPITAL_REQUIREMENT|LIQUIDITY_REQUIREMENT|OPERATIONAL_COST|REPORTING_COST|CONSTRAINT|NONE",
  "quantitative_impact": {
    "impact_metric": "LCR_MINIMUM|TIER1_MINIMUM|LEVERAGE_MINIMUM|RWA_MULTIPLIER|COST_PER_ANNUM|BUFFER_REQUIREMENT",
    "impact_value": number,
    "confidence_score": number,
    "effective_date": "YYYY-MM-DD or null",
    "sunset_date": "YYYY-MM-DD or null"
  } | null,
  "summary_plain": "Brief summary",
  "obligation_type": "MANDATORY|RECOMMENDED|REPORTING|DISCLOSURE|RESTRICTION|GOVERNANCE|RISK_MANAGEMENT|RECORD_KEEPING",
  "risk_area": "LIQUIDITY|CAPITAL|MARKET|CREDIT|OPERATIONAL|CONDUCT|AML_CFT|DATA_PRIVACY|TECH_RISK|OUTSOURCING|IRRBB|RRP|RISK_MANAGEMENT",
  "themes": ["theme1", "theme2"]
}
`;
  }

  // Analyze a single clause for financial impact
  async analyzeClauseFinancialImpact(
    clauseText: string, 
    pathHierarchy: string,
    regulationContext?: string
  ): Promise<FinancialImpactClause> {
    
    const prompt = this.getFinancialImpactPrompt();
    const context = regulationContext ? `Regulation context: ${regulationContext}\n\n` : '';
    
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: `${context}Clause: ${clauseText}\nPath: ${pathHierarchy}` }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const aiAnalysis = JSON.parse(data.choices[0].message.content);

      return {
        clause_id: '', // To be set by caller
        clause_text: clauseText,
        path_hierarchy: pathHierarchy,
        summary_plain: aiAnalysis.summary_plain,
        obligation_type: aiAnalysis.obligation_type,
        risk_area: aiAnalysis.risk_area,
        themes: aiAnalysis.themes || [],
        financial_impact_type: aiAnalysis.financial_impact_type,
        quantitative_impact: aiAnalysis.quantitative_impact
      };

    } catch (error) {
      console.error('AI analysis failed:', error);
      
      // Fallback analysis if AI fails
      return {
        clause_id: '',
        clause_text: clauseText,
        path_hierarchy: pathHierarchy,
        summary_plain: 'AI analysis failed - manual review required',
        obligation_type: 'MANDATORY',
        risk_area: 'RISK_MANAGEMENT',
        themes: [],
        financial_impact_type: 'NONE',
        quantitative_impact: null
      };
    }
  }

  // Calculate financial impacts
  async calculateFinancialImpact(
    clauses: FinancialImpactClause[],
    currentPortfolio: PortfolioAsset[],
    currentFunding: FundingProfile,
    currentCapitalData: { tier1: number; tier2: number },
    currentRegParams: RegulatoryParameters
  ): Promise<FinancialImpactClause[]> {
    
    // Calculate current financial position
    const lcrCalc = new LiquidityCoverageRatioCalculator(currentPortfolio, currentFunding, currentRegParams);
    const currentLCR = lcrCalc.calculateLCR();
    
    const capitalCalc = new CapitalAdequacyCalculator(currentRegParams);
    const currentCapitalBase: CapitalBase = {
      tier1_capital: currentCapitalData.tier1,
      tier2_capital: currentCapitalData.tier2
    };
    const currentCapitalResult = capitalCalc.calculateCapitalRatios(currentPortfolio, currentCapitalBase);

    return await Promise.all(clauses.map(async (clause) => {
      if (!clause.quantitative_impact) {
        return clause;
      }

      const impact = clause.quantitative_impact;
      let calculatedImpact: any = {
        current_compliance_status: 'COMPLIANT',
        financial_shortfall_or_surplus: 0,
        annual_cost_estimate: 0,
        recommended_actions: []
      };

      try {
        switch (impact.impact_metric) {
          case 'LCR_MINIMUM':
            const newLCRRequirement = impact.impact_value;
            if (currentLCR.lcr_ratio < newLCRRequirement) {
              const shortfall = (newLCRRequirement - currentLCR.lcr_ratio) * currentLCR.net_cash_outflows;
              calculatedImpact = {
                current_compliance_status: 'NON_COMPLIANT',
                financial_shortfall_or_surplus: -shortfall,
                annual_cost_estimate: shortfall * 0.025, // 25bps funding cost
                recommended_actions: [
                  `Increase HQLA by £${(shortfall / 1_000_000).toFixed(0)}M`,
                  'Review deposit mix to reduce outflow rates',
                  'Consider secured funding alternatives'
                ]
              };
            }
            break;

          case 'TIER1_MINIMUM':
            const newTier1Requirement = impact.impact_value;
            if (currentCapitalResult.tier1_capital_ratio < newTier1Requirement) {
              const shortfall = (newTier1Requirement - currentCapitalResult.tier1_capital_ratio) * currentCapitalResult.risk_weighted_assets;
              calculatedImpact = {
                current_compliance_status: 'NON_COMPLIANT',
                financial_shortfall_or_surplus: -shortfall,
                annual_cost_estimate: shortfall * 0.12, // 12% cost of equity
                recommended_actions: [
                  `Raise £${(shortfall / 1_000_000).toFixed(0)}M in Tier 1 capital`,
                  'Consider asset optimization to reduce RWA',
                  'Review dividend policy'
                ]
              };
            }
            break;

          case 'COST_PER_ANNUM':
            calculatedImpact = {
              current_compliance_status: 'COMPLIANT',
              financial_shortfall_or_surplus: 0,
              annual_cost_estimate: impact.impact_value,
              recommended_actions: [
                'Budget for additional compliance costs',
                'Review operational efficiency opportunities',
                'Consider technology solutions to reduce manual work'
              ]
            };
            break;

          case 'BUFFER_REQUIREMENT':
            // Additional buffer requirement - affects both capital and liquidity
            const bufferRequirement = impact.impact_value;
            if (clause.risk_area === 'LIQUIDITY') {
              const additionalLiquidityNeeded = currentLCR.net_cash_outflows * bufferRequirement;
              calculatedImpact = {
                current_compliance_status: 'AT_RISK',
                financial_shortfall_or_surplus: -additionalLiquidityNeeded,
                annual_cost_estimate: additionalLiquidityNeeded * 0.025,
                recommended_actions: [
                  `Build additional liquidity buffer of £${(additionalLiquidityNeeded / 1_000_000).toFixed(0)}M`,
                  'Stress test current position against new requirements'
                ]
              };
            } else if (clause.risk_area === 'CAPITAL') {
              const additionalCapitalNeeded = currentCapitalResult.risk_weighted_assets * bufferRequirement;
              calculatedImpact = {
                current_compliance_status: 'AT_RISK',
                financial_shortfall_or_surplus: -additionalCapitalNeeded,
                annual_cost_estimate: additionalCapitalNeeded * 0.12,
                recommended_actions: [
                  `Build additional capital buffer of £${(additionalCapitalNeeded / 1_000_000).toFixed(0)}M`,
                  'Review capital planning assumptions'
                ]
              };
            }
            break;
        }
      } catch (error) {
        console.error('Financial impact calculation failed:', error);
      }

      return {
        ...clause,
        calculated_impact: calculatedImpact
      };
    }));
  }

  // Analyze complete regulatory change event
  async analyzeRegulatoryChange(
    regulationId: string,
    regulationTitle: string,
    clauses: Array<{ id: string; text: string; path: string }>,
    changeType: 'NEW_REGULATION' | 'AMENDMENT' | 'REPEAL' | 'GUIDANCE_UPDATE',
    effectiveDate: string,
    currentFinancialPosition: {
      portfolio: PortfolioAsset[];
      funding: FundingProfile;
      capital: { tier1: number; tier2: number };
      regParams: RegulatoryParameters;
    }
  ): Promise<RegulatoryChangeEvent> {

    // Analyze each clause for financial impact
    const impactClauses = await Promise.all(
      clauses.map(async (clause) => {
        const analysis = await this.analyzeClauseFinancialImpact(
          clause.text, 
          clause.path, 
          regulationTitle
        );
        analysis.clause_id = clause.id;
        return analysis;
      })
    );

    // Calculate financial impacts
    const clausesWithImpact = await this.calculateFinancialImpact(
      impactClauses,
      currentFinancialPosition.portfolio,
      currentFinancialPosition.funding,
      currentFinancialPosition.capital,
      currentFinancialPosition.regParams
    );

    // Aggregate total financial impact
    const totalImpact = clausesWithImpact.reduce(
      (total, clause) => {
        if (!clause.calculated_impact) return total;

        const impact = clause.calculated_impact;
        if (clause.risk_area === 'CAPITAL') {
          total.capital_impact += Math.abs(impact.financial_shortfall_or_surplus);
        } else if (clause.risk_area === 'LIQUIDITY') {
          total.liquidity_impact += Math.abs(impact.financial_shortfall_or_surplus);
        } else {
          total.operational_cost_impact += impact.annual_cost_estimate;
        }
        
        total.total_annual_cost += impact.annual_cost_estimate;
        
        return total;
      },
      {
        capital_impact: 0,
        liquidity_impact: 0,
        operational_cost_impact: 0,
        total_one_time_cost: 0,
        total_annual_cost: 0
      }
    );

    // Calculate one-time implementation costs (estimate)
    totalImpact.total_one_time_cost = (totalImpact.capital_impact + totalImpact.liquidity_impact) * 0.02; // 2% implementation cost

    // Strategic assessment
    const strategicAssessment = this.assessStrategicImpact(clausesWithImpact, totalImpact);

    return {
      id: `change_${Date.now()}`,
      regulation_id: regulationId,
      regulation_title: regulationTitle,
      change_type: changeType,
      change_date: new Date().toISOString(),
      effective_date: effectiveDate,
      affected_clauses: clausesWithImpact,
      total_financial_impact: totalImpact,
      strategic_assessment: strategicAssessment
    };
  }

  // Assess strategic impact based on financial calculations
  private assessStrategicImpact(
    clauses: FinancialImpactClause[],
    totalImpact: any
  ): RegulatoryChangeEvent['strategic_assessment'] {
    
    const totalCost = totalImpact.total_annual_cost + totalImpact.total_one_time_cost;
    const nonCompliantClauses = clauses.filter(c => c.calculated_impact?.current_compliance_status === 'NON_COMPLIANT');
    
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'MAJOR_TRANSFORMATION' = 'SIMPLE';
    let timeline = '3-6 months';

    // Determine severity
    if (totalCost > 100_000_000 || nonCompliantClauses.length > 5) {
      severity = 'CRITICAL';
      timeline = '12-18 months';
    } else if (totalCost > 50_000_000 || nonCompliantClauses.length > 2) {
      severity = 'HIGH';
      timeline = '9-12 months';
    } else if (totalCost > 10_000_000 || nonCompliantClauses.length > 0) {
      severity = 'MEDIUM';
      timeline = '6-9 months';
    }

    // Determine complexity
    const uniqueRiskAreas = new Set(clauses.map(c => c.risk_area)).size;
    const hasCapitalImpact = totalImpact.capital_impact > 0;
    const hasLiquidityImpact = totalImpact.liquidity_impact > 0;
    
    if (uniqueRiskAreas > 4 && hasCapitalImpact && hasLiquidityImpact) {
      complexity = 'MAJOR_TRANSFORMATION';
    } else if (uniqueRiskAreas > 2 && (hasCapitalImpact || hasLiquidityImpact)) {
      complexity = 'COMPLEX';
    } else if (uniqueRiskAreas > 1) {
      complexity = 'MODERATE';
    }

    return {
      overall_severity: severity,
      implementation_complexity: complexity,
      recommended_timeline: timeline,
      key_risks: [
        ...(nonCompliantClauses.length > 0 ? ['Immediate compliance breaches identified'] : []),
        ...(totalImpact.capital_impact > 50_000_000 ? ['Significant capital raising required'] : []),
        ...(totalImpact.liquidity_impact > 50_000_000 ? ['Major liquidity restructuring needed'] : []),
        ...(totalImpact.operational_cost_impact > 10_000_000 ? ['High ongoing compliance costs'] : [])
      ],
      opportunities: [
        ...(severity === 'LOW' ? ['Competitive advantage through early compliance'] : []),
        'Process optimization during implementation',
        'Technology upgrade opportunities',
        'Stakeholder engagement and communication'
      ]
    };
  }

  // Generate executive summary report
  generateExecutiveReport(changeEvent: RegulatoryChangeEvent): string {
    const { regulation_title, total_financial_impact, strategic_assessment, affected_clauses } = changeEvent;
    
    const formatCurrency = (amount: number) => `£${(amount / 1_000_000).toFixed(1)}M`;
    
    return `
# Executive Summary: ${regulation_title}

## Financial Impact Assessment

**Total Annual Cost:** ${formatCurrency(total_financial_impact.total_annual_cost)}
**One-time Implementation:** ${formatCurrency(total_financial_impact.total_one_time_cost)}

### Capital & Liquidity Impact
- **Additional Capital Required:** ${formatCurrency(total_financial_impact.capital_impact)}
- **Additional Liquidity Required:** ${formatCurrency(total_financial_impact.liquidity_impact)}
- **Operational Cost Increase:** ${formatCurrency(total_financial_impact.operational_cost_impact)} annually

## Strategic Assessment

**Overall Severity:** ${strategic_assessment.overall_severity}
**Implementation Complexity:** ${strategic_assessment.implementation_complexity}
**Recommended Timeline:** ${strategic_assessment.recommended_timeline}

### Key Risks
${strategic_assessment.key_risks.map(risk => `- ${risk}`).join('\n')}

### Implementation Recommendations
${affected_clauses
  .filter(c => c.calculated_impact?.recommended_actions?.length)
  .slice(0, 5)
  .map(c => c.calculated_impact!.recommended_actions.map(action => `- ${action}`).join('\n'))
  .join('\n')}

### Next Steps
1. **Immediate (0-30 days):** Review compliance status and identify quick wins
2. **Short-term (1-3 months):** Begin implementation planning and resource allocation
3. **Medium-term (3-12 months):** Execute major changes and monitor compliance
4. **Long-term (12+ months):** Optimize processes and maintain compliance

---
*Report generated on ${new Date().toLocaleDateString()} by Reggio AI*
`;
  }
}

// Example usage
export async function demonstrateSmartAnalysis() {
  const analyzer = new SmartRegulatoryAnalyzer('your-groq-api-key', null);
  
  // Example: New liquidity regulation
  const sampleClauses = [
    {
      id: 'clause_1',
      text: 'Banks must maintain a liquidity coverage ratio of at least 110% at all times, effective from 1 April 2024.',
      path: 'Section 2.1.1'
    },
    {
      id: 'clause_2', 
      text: 'Additional capital conservation buffer of 2.5% must be maintained above minimum Tier 1 requirements.',
      path: 'Section 3.2.1'
    }
  ];

  const mockFinancialPosition = {
    portfolio: [], // Would be real portfolio data
    funding: {} as FundingProfile,
    capital: { tier1: 150_000_000, tier2: 35_000_000 },
    regParams: {} as RegulatoryParameters
  };

  const changeEvent = await analyzer.analyzeRegulatoryChange(
    'reg_123',
    'PRA Liquidity and Capital Requirements Update 2024',
    sampleClauses,
    'AMENDMENT',
    '2024-04-01',
    mockFinancialPosition
  );

  const executiveReport = analyzer.generateExecutiveReport(changeEvent);
  
  return {
    changeEvent,
    executiveReport
  };
}
