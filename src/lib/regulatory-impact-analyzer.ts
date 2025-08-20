// Placeholder RegulatoryImpactAnalyzer for compatibility
export class RegulatoryImpactAnalyzer {
  analyze(change: any): any {
    return {
      severity: 'MEDIUM',
      impact_areas: ['capital', 'liquidity'],
      compliance_cost: 1000000,
      timeline_months: 12
    };
  }
}