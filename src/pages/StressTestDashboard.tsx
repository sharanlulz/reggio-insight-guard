// src/pages/StressTestDashboard.tsx
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withRetry } from "@/lib/supaRetry";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, Target, FileText } from "lucide-react";

type StressTestRequirement = {
  id: string;
  regulation_id: string;
  requirement_type: 'CAPITAL_ADEQUACY' | 'LIQUIDITY_COVERAGE' | 'MARKET_RISK' | 'CREDIT_RISK' | 'OPERATIONAL_RISK' | 'IRRBB' | 'CONCENTRATION_RISK';
  description: string;
  frequency: 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'AD_HOC';
  severity_threshold: 'SEVERE_BUT_PLAUSIBLE' | 'ADVERSE' | 'BASELINE';
  regulation_title?: string;
  regulation_short_code?: string;
};

type ComplianceOverview = {
  regulation_title: string;
  requirements_total: number;
  requirements_mapped: number;
  scenarios_covered: number;
  last_simulation_date: string | null;
  compliance_rate: number;
};

const REQUIREMENT_TYPE_COLORS: Record<string, string> = {
  'CAPITAL_ADEQUACY': 'bg-red-100 text-red-800',
  'LIQUIDITY_COVERAGE': 'bg-blue-100 text-blue-800',
  'MARKET_RISK': 'bg-orange-100 text-orange-800',
  'CREDIT_RISK': 'bg-purple-100 text-purple-800',
  'OPERATIONAL_RISK': 'bg-yellow-100 text-yellow-800',
  'IRRBB': 'bg-green-100 text-green-800',
  'CONCENTRATION_RISK': 'bg-pink-100 text-pink-800',
};

const FREQUENCY_LABELS: Record<string, string> = {
  'ANNUAL': 'Annual',
  'SEMI_ANNUAL': 'Semi-Annual',
  'QUARTERLY': 'Quarterly',
  'MONTHLY': 'Monthly',
  'AD_HOC': 'Ad-Hoc',
};

export default function StressTestDashboard() {
  const [requirements, setRequirements] = useState<StressTestRequirement[]>([]);
  const [overview, setOverview] = useState<ComplianceOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const loadStressTestData = useCallback(async () => {
    setLoading(true);
    try {
      // Load stress test requirements (this will be from the new schema)
      // For now, we'll simulate this data since the stress test schema isn't implemented yet
      const mockRequirements: StressTestRequirement[] = [
        {
          id: '1',
          regulation_id: 'reg1',
          requirement_type: 'CAPITAL_ADEQUACY',
          description: 'Banks must maintain minimum capital ratios under severely adverse scenarios',
          frequency: 'ANNUAL',
          severity_threshold: 'SEVERE_BUT_PLAUSIBLE',
          regulation_title: 'PRA Capital (Test Extract)',
          regulation_short_code: 'PRA-CAP-TEST',
        },
        {
          id: '2',
          regulation_id: 'reg1',
          requirement_type: 'LIQUIDITY_COVERAGE',
          description: 'Liquidity Coverage Ratio must remain above 100% under stress',
          frequency: 'QUARTERLY',
          severity_threshold: 'ADVERSE',
          regulation_title: 'PRA Liquidity (Test Extract)',
          regulation_short_code: 'PRA-LIQ-TEST',
        },
      ];

      const mockOverview: ComplianceOverview[] = [
        {
          regulation_title: 'PRA Liquidity (Test Extract)',
          requirements_total: 5,
          requirements_mapped: 3,
          scenarios_covered: 2,
          last_simulation_date: new Date().toISOString(),
          compliance_rate: 60,
        },
      ];

      setRequirements(mockRequirements);
      setOverview(mockOverview);

    } catch (error: any) {
      console.error('Failed to load stress test data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStressTestData();
  }, [loadStressTestData]);

  const filteredRequirements = selectedType === 'ALL' 
    ? requirements 
    : requirements.filter(req => req.requirement_type === selectedType);

  const requirementTypes = Array.from(new Set(requirements.map(req => req.requirement_type)));
  const totalRequirements = requirements.length;
  const avgComplianceRate = overview.reduce((acc, item) => acc + item.compliance_rate, 0) / Math.max(overview.length, 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stress Testing Dashboard</h1>
          <p className="text-muted-foreground">Monitor regulatory stress test requirements and compliance</p>
        </div>
        <Button onClick={loadStressTestData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-blue-600" />
            <div className="text-sm font-medium">Total Requirements</div>
          </div>
          <div className="text-2xl font-bold">{totalRequirements}</div>
          <p className="text-xs text-muted-foreground">Across all regulations</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div className="text-sm font-medium">Avg Compliance</div>
          </div>
          <div className="text-2xl font-bold">{Math.round(avgComplianceRate)}%</div>
          <p className="text-xs text-muted-foreground">Requirements mapped</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <div className="text-sm font-medium">High Priority</div>
          </div>
          <div className="text-2xl font-bold">
            {requirements.filter(req => req.frequency === 'QUARTERLY' || req.frequency === 'MONTHLY').length}
          </div>
          <p className="text-xs text-muted-foreground">Frequent testing required</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-purple-600" />
            <div className="text-sm font-medium">Scenarios Available</div>
          </div>
          <div className="text-2xl font-bold">
            {overview.reduce((acc, item) => acc + item.scenarios_covered, 0)}
          </div>
          <p className="text-xs text-muted-foreground">Fed, BoE, EBA scenarios</p>
        </Card>
      </div>

      {/* Compliance Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Compliance Overview by Regulation</h3>
        <div className="space-y-4">
          {overview.map((item, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{item.regulation_title}</div>
                <Badge variant={item.compliance_rate >= 80 ? "default" : item.compliance_rate >= 60 ? "secondary" : "destructive"}>
                  {item.compliance_rate}% Complete
                </Badge>
              </div>
              <Progress value={item.compliance_rate} className="h-2 mb-2" />
              <div className="text-sm text-muted-foreground grid grid-cols-3 gap-4">
                <span>Requirements: {item.requirements_mapped}/{item.requirements_total}</span>
                <span>Scenarios: {item.scenarios_covered}</span>
                <span>Last Run: {item.last_simulation_date ? new Date(item.last_simulation_date).toLocaleDateString() : 'Never'}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Requirements Filter */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">Filter by type:</span>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedType === 'ALL' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedType('ALL')}
            >
              All ({totalRequirements})
            </Button>
            {requirementTypes.map(type => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
              >
                {type.replace('_', ' ')} ({requirements.filter(req => req.requirement_type === type).length})
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Requirements List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Stress Test Requirements 
            {selectedType !== 'ALL' && ` - ${selectedType.replace('_', ' ')}`}
          </h3>
          <Button variant="outline" size="sm">
            Export Report
          </Button>
        </div>

        <div className="space-y-3">
          {filteredRequirements.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No stress test requirements found. Ingest regulatory documents to automatically identify requirements.
              </AlertDescription>
            </Alert>
          ) : (
            filteredRequirements.map((req) => (
              <div key={req.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-1">
                    <div className="font-medium">{req.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {req.regulation_title} ({req.regulation_short_code})
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={REQUIREMENT_TYPE_COLORS[req.requirement_type] || 'bg-gray-100 text-gray-800'}>
                      {req.requirement_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <span className="text-muted-foreground">
                      Frequency: <span className="font-medium">{FREQUENCY_LABELS[req.frequency]}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Threshold: <span className="font-medium">{req.severity_threshold.replace('_', ' ')}</span>
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="outline" size="sm">Run Simulation</Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Next Steps */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Implementation Status:</strong> This dashboard shows the planned stress testing interface. 
          The stress testing schema and AI requirement extraction are next in development. 
          Current focus: Complete schema fixes and basic ingestion reliability.
        </AlertDescription>
      </Alert>
    </div>
  );
}
