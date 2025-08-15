// Create new file: src/types/stress-testing.ts
// TypeScript types for stress testing functionality

export interface StressTestRequirement {
  id: string;
  clause_id: string;
  requirement_type: 'capital_ratio' | 'loss_rate' | 'scenario_parameter';
  metric_name: string;
  threshold_operator?: '>=' | '<=' | '=' | 'range';
  threshold_value?: number;
  threshold_max?: number;
  time_horizon_quarters?: number;
  stress_category?: 'credit' | 'market' | 'operational' | 'liquidity' | 'capital';
  description?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data from clauses
  clause?: {
    path_hierarchy: string;
    text_raw: string;
    regulation?: {
      title: string;
      short_code: string;
    };
  };
}

export interface RegulatoryScenario {
  id: string;
  regulation_id: string;
  scenario_name: string;
  scenario_type: 'supervisory' | 'adverse' | 'baseline' | 'idiosyncratic';
  regulator_source: 'Federal_Reserve' | 'Bank_of_England' | 'EBA' | 'FDIC' | 'OCC';
  published_date: string;
  effective_date?: string;
  time_horizon_quarters: number;
  description?: string;
  economic_variables: EconomicVariables;
  created_at: string;
  
  // Joined regulation data
  regulation?: {
    title: string;
    short_code: string;
    jurisdiction?: string;
  };
}

export interface EconomicVariables {
  gdp_growth?: number[];
  unemployment_rate?: number[];
  treasury_3m?: number[];
  treasury_10y?: number[];
  corporate_spread?: number[];
  equity_decline_percent?: number;
  house_price_index?: number[];
  commercial_real_estate_index?: number[];
  vix?: number[];
  // Additional variables as needed
  [key: string]: number[] | number | undefined;
}

export interface Institution {
  id: string;
  org_id: string;
  institution_name: string;
  institution_type?: 'large_bank' | 'regional_bank' | 'credit_union' | 'broker_dealer';
  regulatory_classification?: 'G-SIB' | 'Category_I' | 'Category_II' | 'Category_III' | 'Community_Bank';
  total_assets?: number;
  jurisdiction?: string;
  primary_regulator?: 'Federal_Reserve' | 'FDIC' | 'OCC' | 'NCUA';
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  institution_id: string;
  portfolio_name: string;
  asset_class: 'commercial_loans' | 'consumer_loans' | 'securities' | 'trading_assets' | 'real_estate' | 'other';
  portfolio_data: PortfolioData;
  data_source: 'manual' | 'imported' | 'estimated';
  as_of_date: string;
  created_at: string;
}

export interface PortfolioData {
  total_balance: number;
  average_pd?: number; // Probability of Default
  lgd?: number; // Loss Given Default
  maturity_years?: number;
  credit_rating_distribution?: Record<string, number>;
  geographic_distribution?: Record<string, number>;
  industry_distribution?: Record<string, number>;
  // Additional portfolio-specific data
  [key: string]: any;
}

export interface StressTestRun {
  id: string;
  institution_id: string;
  scenario_id?: string;
  run_name: string;
  run_type: 'full' | 'quick' | 'regulatory';
  run_parameters: StressTestParameters;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: StressTestResults;
  compliance_assessment?: ComplianceAssessment;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  
  // Joined data
  institution?: Institution;
  scenario?: RegulatoryScenario;
}

export interface StressTestParameters {
  simulation_type: 'monte_carlo' | 'deterministic';
  num_simulations?: number; // for Monte Carlo
  confidence_levels: number[]; // e.g., [95, 99, 99.9]
  portfolio_ids: string[];
  custom_assumptions?: Record<string, any>;
  model_overrides?: Record<string, any>;
}

export interface StressTestResults {
  institution_id: string;
  scenario_id?: string;
  summary_metrics: {
    total_projected_loss: number;
    loss_rate_percent: number;
    tier1_capital_ratio: number;
    leverage_ratio: number;
    liquidity_coverage_ratio?: number;
  };
  portfolio_results: Record<string, PortfolioResults>;
  time_series_projections: {
    quarters: number[];
    capital_ratios: number[];
    cumulative_losses: number[];
    net_income: number[];
  };
  confidence_intervals: {
    [confidence: string]: {
      loss_at_confidence: number;
      capital_ratio_at_confidence: number;
    };
  };
  model_diagnostics: {
    convergence_status: 'converged' | 'warning' | 'failed';
    simulation_time_seconds: number;
    warnings: string[];
  };
}

export interface PortfolioResults {
  portfolio_id: string;
  portfolio_name: string;
  projected_loss: number;
  loss_rate_percent: number;
  loss_distribution: {
    percentile_95: number;
    percentile_99: number;
    percentile_999: number;
    expected_loss: number;
  };
  stress_factors_applied: Record<string, number>;
}

export interface ComplianceAssessment {
  overall_status: 'compliant' | 'non_compliant' | 'warning';
  requirements_checked: number;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  recommendations: string[];
  regulatory_context: {
    applicable_regulations: string[];
    stress_test_type: string;
    reporting_requirements: string[];
  };
}

export interface ComplianceViolation {
  requirement_id: string;
  metric_name: string;
  actual_value: number;
  required_value: number;
  threshold_operator: string;
  severity: 'critical' | 'major' | 'minor';
  regulatory_citation: {
    regulation_title: string;
    clause_path: string;
    clause_text: string;
  };
  remediation_suggestions: string[];
}

export interface ComplianceWarning {
  requirement_id: string;
  metric_name: string;
  actual_value: number;
  warning_threshold: number;
  message: string;
  regulatory_citation?: {
    regulation_title: string;
    clause_path: string;
  };
}

export interface ModelRequirement {
  id: string;
  clause_id: string;
  model_type: 'credit_loss' | 'pre_provision_revenue' | 'balance_sheet' | 'capital_planning' | 'liquidity';
  required_inputs: string[];
  methodology_description?: string;
  validation_requirements?: string;
  model_frequency?: 'quarterly' | 'annual' | 'ad_hoc';
  created_at: string;
  
  // Joined clause data
  clause?: {
    path_hierarchy: string;
    text_raw: string;
    regulation?: {
      title: string;
      short_code: string;
    };
  };
}

// UI State interfaces
export interface StressTestFilters {
  institution_id?: string;
  scenario_type?: RegulatoryScenario['scenario_type'];
  regulator_source?: RegulatoryScenario['regulator_source'];
  status?: StressTestRun['status'];
  date_range?: {
    start: string;
    end: string;
  };
}

export interface ScenarioFilters {
  regulator_source?: RegulatoryScenario['regulator_source'];
  scenario_type?: RegulatoryScenario['scenario_type'];
  year?: number;
  regulation_id?: string;
}

// API Response types
export interface StressTestApiResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    details?: any;
  };
}

// Dashboard summary types
export interface StressTestSummary {
  total_runs: number;
  active_runs: number;
  completed_runs: number;
  failed_runs: number;
  compliance_rate: number;
  average_tier1_ratio: number;
  institutions_tested: number;
  scenarios_available: number;
}

// Export utility types
export type StressTestStatus = StressTestRun['status'];
export type ScenarioType = RegulatoryScenario['scenario_type'];
export type InstitutionType = Institution['institution_type'];
export type AssetClass = Portfolio['asset_class'];
export type RequirementType = StressTestRequirement['requirement_type'];
export type ModelType = ModelRequirement['model_type'];
