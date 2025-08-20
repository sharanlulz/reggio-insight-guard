// Stress test specific types to avoid circular imports
export interface StressTestAsset {
  id: string;
  asset_class: string;
  market_value: number;
  liquidity_classification: string;
  rating?: string;
  sector?: string;
}

export interface StressTestFunding {
  retail_deposits: number;
  corporate_deposits: number;
  wholesale_funding: number;
  secured_funding?: number;
}

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