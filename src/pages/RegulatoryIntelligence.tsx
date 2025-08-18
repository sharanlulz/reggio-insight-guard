import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Clock, 
  Target,
  Download,
  Eye,
  Calculator,
  Zap
} from 'lucide-react';

// Mock data demonstrating the Smart Regulatory Analysis in action
const mockRegulatoryChanges = [
  {
    id: 'change_001',
    regulation_title: 'PRA Liquidity Requirements Update 2024',
    change_type: 'AMENDMENT',
    change_date: '2024-01-15',
    effective_date: '2024-04-01',
    status: 'analyzing',
    total_financial_impact: {
      capital_impact: 0,
      liquidity_impact: 75_000_000,
      operational_cost_impact: 8_000_000,
      total_one_time_cost: 1_500_000,
      total_annual_cost: 8_000_000
    },
    strategic_assessment: {
      overall_severity: 'HIGH',
      implementation_complexity: 'MODERATE',
      recommended_timeline: '6-9 months',
      key_risks: [
        'LCR requirement increases to 110%',
        'Current position may fall below new threshold',
        'Additional liquidity buffer needed'
      ],
      opportunities: [
        'Optimize funding mix',
        'Review HQLA portfolio composition',
        'Competitive advantage through early compliance'
      ]
    },
    affected_clauses: [
      {
        clause_id: 'clause_001',
        path_hierarchy: 'Section 2.1.1',
        summary_plain: 'Minimum LCR requirement increased from 100% to 110%',
        financial_impact_type: 'LIQUIDITY_REQUIREMENT',
        quantitative_impact: {
          impact_metric: 'LCR_MINIMUM',
          impact_value: 1.10,
          confidence_score: 0.95,
          effective_date: '2024-04-01'
        },
        calculated_impact: {
          current_compliance_status: 'AT_RISK',
          financial_shortfall_or_surplus: -50_000_000,
          annual_cost_estimate: 5_000_000,
          recommended_actions: [
            'Increase HQLA by £50M',
            'Review deposit mix to reduce outflow rates',
            'Consider secured funding alternatives'
          ]
        }
      },
      {
        clause_id: 'clause_002',
        path_hierarchy: 'Section 2.3.4',
        summary_plain: 'Enhanced stress testing requirements for liquidity planning',
        financial_impact_type: 'OPERATIONAL_COST',
        quantitative_impact: {
          impact_metric: 'COST_PER_ANNUM',
          impact_value: 3_000_000,
          confidence_score: 0.80,
          effective_date: '2024-04-01'
        },
        calculated_impact: {
          current_compliance_status: 'COMPLIANT',
          financial_shortfall_or_surplus: 0,
          annual_cost_estimate: 3_000_000,
          recommended_actions: [
            'Budget for enhanced stress testing capabilities',
            'Consider automated stress testing solutions',
            'Review current stress testing processes'
          ]
        }
      }
    ]
  },
  {
    id: 'change_002',
    regulation_title: 'Basel IV Capital Framework - Final Rules',
    change_type: 'NEW_REGULATION',
    change_date: '2024-01-20',
    effective_date: '2025-01-01',
    status: 'impact_calculated',
    total_financial_impact: {
      capital_impact: 120_000_000,
      liquidity_impact: 0,
      operational_cost_impact: 15_000_000,
      total_one_time_cost: 8_000_000,
      total_annual_cost: 15_000_000
    },
    strategic_assessment: {
      overall_severity: 'CRITICAL',
      implementation_complexity: 'MAJOR_TRANSFORMATION',
      recommended_timeline: '12-18 months',
      key_risks: [
        'Significant increase in RWA calculations',
        'Major capital raising may be required',
        'Complex systems implementation needed'
      ],
      opportunities: [
        'Business model optimization',
        'Competitive positioning through efficiency',
        'Technology modernization'
      ]
    },
    affected_clauses: [
      {
        clause_id: 'clause_003',
        path_hierarchy: 'Article 92.1',
        summary_plain: 'Standardised approach for credit risk - revised risk weights',
        financial_impact_type: 'CAPITAL_REQUIREMENT',
        quantitative_impact: {
          impact_metric: 'RWA_MULTIPLIER',
          impact_value: 1.15,
          confidence_score: 0.85,
          effective_date: '2025-01-01'
        },
        calculated_impact: {
          current_compliance_status: 'NON_COMPLIANT',
          financial_shortfall_or_surplus: -80_000_000,
          annual_cost_estimate: 12_000_000,
          recommended_actions: [
            'Raise £80M in Tier 1 capital',
            'Review loan portfolio composition',
            'Consider asset optimization strategies'
          ]
        }
      }
    ]
  }
];

const mockRegulations = [
  { id: 'reg_001', title: 'PRA Liquidity Requirements', status: 'monitoring', last_change: '2024-01-15' },
  { id: 'reg_002', title: 'Basel IV Capital Framework', status: 'analyzing', last_change: '2024-01-20' },
  { id: 'reg_003', title: 'CRD VI Implementation', status: 'stable', last_change: '2023-12-01' },
  { id: 'reg_004', title: 'MREL and TLAC Requirements', status: 'stable', last_change: '2023-11-15' }
];

// Format currency
const formatCurrency = (amount: number) => `£${(amount / 1_000_000).toFixed(1)}M`;

// Format percentage
const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

// Regulatory Change Impact Dashboard
const RegulatoryChangeImpactDashboard: React.FC = () => {
  const [selectedChange, setSelectedChange] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'overview' | 'detailed' | 'recommendations'>('overview');
  const [analyzing, setAnalyzing] = useState(false);

  const selectedChangeData = mockRegulatoryChanges.find(c => c.id === selectedChange);

  const runNewAnalysis = async (regulationId: string) => {
    setAnalyzing(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    setAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Regulatory Change Intelligence</h1>
          <p className="text-muted-foreground">AI-powered financial impact analysis of regulatory changes</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Reports
          </Button>
          <Button>
            <Zap className="h-4 w-4 mr-2" />
            Analyze New Regulation
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">Active Changes</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">2</div>
            <div className="text-xs text-muted-foreground">Requiring immediate attention</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium">Total Impact</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-red-600">£218M</div>
            <div className="text-xs text-muted-foreground">Capital + Liquidity requirements</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">Annual Costs</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">£23M</div>
            <div className="text-xs text-muted-foreground">Ongoing compliance costs</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Urgent Actions</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">5</div>
            <div className="text-xs text-muted-foreground">Due within 6 months</div>
          </div>
        </Card>
      </div>

      {/* Regulatory Changes List */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Regulatory Changes</h3>
          <div className="space-y-4">
            {mockRegulatoryChanges.map((change) => (
              <div 
                key={change.id} 
                className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedChange === change.id ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setSelectedChange(change.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium">{change.regulation_title}</div>
                  <Badge variant={
                    change.strategic_assessment.overall_severity === 'CRITICAL' ? 'destructive' :
                    change.strategic_assessment.overall_severity === 'HIGH' ? 'secondary' : 'default'
                  }>
                    {change.strategic_assessment.overall_severity}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground mb-3">
                  Effective: {new Date(change.effective_date).toLocaleDateString()} • 
                  Type: {change.change_type}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Financial Impact:</span>
                    <div className="font-medium text-red-600">
                      {formatCurrency(change.total_financial_impact.capital_impact + change.total_financial_impact.liquidity_impact)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Annual Cost:</span>
                    <div className="font-medium">
                      {formatCurrency(change.total_financial_impact.total_annual_cost)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    Timeline: {change.strategic_assessment.recommended_timeline} • 
                    Complexity: {change.strategic_assessment.implementation_complexity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Regulation Monitoring */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Regulation Monitoring</h3>
            <Badge variant="outline">4 Tracked</Badge>
          </div>
          
          <div className="space-y-3">
            {mockRegulations.map((reg) => (
              <div key={reg.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-sm">{reg.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Last change: {new Date(reg.last_change).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    reg.status === 'analyzing' ? 'secondary' :
                    reg.status === 'monitoring' ? 'default' : 'outline'
                  } className="text-xs">
                    {reg.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runNewAnalysis(reg.id)}
                    disabled={analyzing}
                  >
                    <Calculator className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {analyzing && (
            <Alert className="mt-4">
              <Zap className="h-4 w-4 animate-pulse" />
              <AlertDescription>
                AI analyzing regulatory changes and calculating financial impact...
              </AlertDescription>
            </Alert>
          )}
        </Card>
      </div>

      {/* Detailed Analysis */}
      {selectedChangeData && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {selectedChangeData.regulation_title} - Detailed Analysis
            </h3>
            <div className="flex gap-2">
              <Button
                variant={analysisMode === 'overview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisMode('overview')}
              >
                Overview
              </Button>
              <Button
                variant={analysisMode === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisMode('detailed')}
              >
                Clause Analysis
              </Button>
              <Button
                variant={analysisMode === 'recommendations' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisMode('recommendations')}
              >
                Recommendations
              </Button>
            </div>
          </div>

          {analysisMode === 'overview' && (
            <div className="space-y-6">
              {/* Financial Impact Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Capital Impact</div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(selectedChangeData.total_financial_impact.capital_impact)}
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Liquidity Impact</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedChangeData.total_financial_impact.liquidity_impact)}
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Annual Costs</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(selectedChangeData.total_financial_impact.total_annual_cost)}
                  </div>
                </div>
              </div>

              {/* Key Risks and Opportunities */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Key Risks
                  </h4>
                  <ul className="space-y-2">
                    {selectedChangeData.strategic_assessment.key_risks.map((risk, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2"></div>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    Opportunities
                  </h4>
                  <ul className="space-y-2">
                    {selectedChangeData.strategic_assessment.opportunities.map((opp, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2"></div>
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {analysisMode === 'detailed' && (
            <div className="space-y-4">
              <h4 className="font-medium">Clause-by-Clause Financial Impact</h4>
              {selectedChangeData.affected_clauses.map((clause, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">{clause.path_hierarchy}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {clause.summary_plain}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={clause.calculated_impact?.current_compliance_status === 'NON_COMPLIANT' ? 'destructive' : 
                                     clause.calculated_impact?.current_compliance_status === 'AT_RISK' ? 'secondary' : 'default'}>
                        {clause.calculated_impact?.current_compliance_status}
                      </Badge>
                      <Badge variant="outline">
                        {Math.round((clause.quantitative_impact?.confidence_score || 0) * 100)}% confident
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Quantitative Impact</div>
                      <div className="font-medium">
                        {clause.quantitative_impact?.impact_metric}: {
                          clause.quantitative_impact?.impact_metric.includes('MINIMUM') || 
                          clause.quantitative_impact?.impact_metric.includes('MULTIPLIER') 
                            ? formatPercentage(clause.quantitative_impact?.impact_value || 0)
                            : formatCurrency(clause.quantitative_impact?.impact_value || 0)
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Financial Shortfall</div>
                      <div className={`font-medium ${
                        (clause.calculated_impact?.financial_shortfall_or_surplus || 0) < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(Math.abs(clause.calculated_impact?.financial_shortfall_or_surplus || 0))}
                        {(clause.calculated_impact?.financial_shortfall_or_surplus || 0) < 0 ? ' shortfall' : ' surplus'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {analysisMode === 'recommendations' && (
            <div className="space-y-4">
              <h4 className="font-medium">AI-Generated Action Plan</h4>
              {selectedChangeData.affected_clauses.map((clause, clauseIndex) => (
                clause.calculated_impact?.recommended_actions.map((action, actionIndex) => (
                  <div key={`${clauseIndex}-${actionIndex}`} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600 mt-0.5">
                      {clauseIndex + 1}.{actionIndex + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm">{action}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Related to: {clause.path_hierarchy}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Schedule</Button>
                      <Button size="sm">Assign</Button>
                    </div>
                  </div>
                ))
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default RegulatoryChangeImpactDashboard;
