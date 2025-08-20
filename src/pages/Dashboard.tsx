import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  TrendingUp,
  BarChart3,
  FileText
} from 'lucide-react';

// Real data service with fallback logic
class RegulatoryDataService {
  private static instance: RegulatoryDataService;
  private connectionStatus: 'live' | 'cached' | 'mock' = 'mock';
  private lastSyncTime: Date | null = null;

  static getInstance(): RegulatoryDataService {
    if (!RegulatoryDataService.instance) {
      RegulatoryDataService.instance = new RegulatoryDataService();
    }
    return RegulatoryDataService.instance;
  }

  async fetchRegulatoryMetrics() {
    try {
      // Attempt real data fetch
      const realData = await this.fetchFromSupabase();
      this.connectionStatus = 'live';
      this.lastSyncTime = new Date();
      return realData;
    } catch (error) {
      console.warn('Live data unavailable, using fallback:', error.message);
      
      try {
        // Try cached data
        const cachedData = this.getCachedData();
        if (cachedData) {
          this.connectionStatus = 'cached';
          return cachedData;
        }
      } catch (cacheError) {
        console.warn('Cache unavailable:', cacheError.message);
      }
      
      // Fall back to intelligent mock data
      this.connectionStatus = 'mock';
      return this.getIntelligentMockData();
    }
  }

  private async fetchFromSupabase() {
    // Simulated Supabase query - replace with actual when limits reset
    const response = await fetch('/api/regulatory-metrics', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }
    
    return await response.json();
  }

  private getCachedData() {
    // Try to get cached data from localStorage or IndexedDB
    const cached = localStorage.getItem('reggio_regulatory_cache');
    if (cached) {
      const data = JSON.parse(cached);
      const cacheAge = Date.now() - data.timestamp;
      
      // Use cache if less than 4 hours old
      if (cacheAge < 4 * 60 * 60 * 1000) {
        return data.metrics;
      }
    }
    return null;
  }

  private getIntelligentMockData() {
    // Enhanced mock data that simulates what real ingested data would look like
    const now = new Date();
    
    return {
      dataSource: 'mock',
      timestamp: now.toISOString(),
      metrics: {
        totalRegulations: 23,
        totalClauses: 1247,
        financialImpactClauses: 342,
        lastIngestion: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        
        // Simulated real analysis results
        clauseAnalysis: {
          capitalRequirements: {
            count: 89,
            avgConfidence: 0.92,
            sources: ['Basel 3.1', 'CRD V', 'PRA CP3/23'],
            lastAnalyzed: new Date(now.getTime() - 30 * 60 * 1000).toISOString()
          },
          liquidityRequirements: {
            count: 156,
            avgConfidence: 0.89,
            sources: ['CRR Part Six', 'ILAAP Rules', 'LCR Delegated Act'],
            lastAnalyzed: new Date(now.getTime() - 45 * 60 * 1000).toISOString()
          }
        },

        // Real financial calculations (would be computed from ingested data)
        financialImpacts: {
          totalEstimatedCost: 127500000,
          confidence: 87,
          breakdown: {
            capital: { amount: 67000000, confidence: 95, regulations: 8 },
            liquidity: { amount: 52000000, confidence: 89, regulations: 12 },
            operational: { amount: 8500000, confidence: 78, regulations: 15 }
          }
        },

        // Would be extracted from actual ingested regulatory documents
        upcomingDeadlines: [
          {
            regulation: 'Basel 3.1 Implementation',
            source: 'PRA CP3/23',
            deadline: '2025-07-01',
            impact: 67000000,
            confidence: 95,
            clauses: 23
          },
          {
            regulation: 'ILAAP Annual Review', 
            source: 'PRA Rulebook Chapter 13',
            deadline: '2025-03-31',
            impact: 1500000,
            confidence: 92,
            clauses: 8
          }
        ]
      }
    };
  }

  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      lastSync: this.lastSyncTime,
      isLive: this.connectionStatus === 'live'
    };
  }

  // Cache data for offline use
  cacheData(data: any) {
    try {
      localStorage.setItem('reggio_regulatory_cache', JSON.stringify({
        timestamp: Date.now(),
        metrics: data
      }));
    } catch (error) {
      console.warn('Could not cache data:', error);
    }
  }
}

const RealDataIntegration: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const dataService = RegulatoryDataService.getInstance();

  const loadData = async () => {
    setLoading(true);
    try {
      const regulatoryData = await dataService.fetchRegulatoryMetrics();
      setData(regulatoryData);
      setConnectionStatus(dataService.getConnectionStatus());
      
      // Cache successful data fetch
      if (regulatoryData.dataSource !== 'mock') {
        dataService.cacheData(regulatoryData);
      }
    } catch (error) {
      console.error('Failed to load regulatory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
    
    // Set up periodic refresh (every 5 minutes)
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    if (!connectionStatus) return null;
    
    switch (connectionStatus.status) {
      case 'live':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Wifi className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        );
      case 'cached':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Database className="h-3 w-3 mr-1" />
            Cached Data
          </Badge>
        );
      case 'mock':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Demo Mode
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    if (!connectionStatus) return '';
    
    switch (connectionStatus.status) {
      case 'live':
        return `Connected to live regulatory database. Last sync: ${connectionStatus.lastSync?.toLocaleTimeString()}`;
      case 'cached':
        return 'Using cached regulatory data. Live connection will resume automatically.';
      case 'mock':
        return 'Demo mode active. Connect to Supabase for live regulatory analysis.';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold mb-2">Loading Regulatory Intelligence</h3>
            <p className="text-gray-600">Connecting to regulatory data sources...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Connection Status */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Regulatory Intelligence Platform</h1>
            <p className="text-gray-600 mt-2">Real-time regulatory analysis with intelligent fallbacks</p>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge()}
            <Button
              variant="outline"
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Connection Status Alert */}
        <Alert className={
          connectionStatus?.status === 'live' ? 'border-green-200 bg-green-50' :
          connectionStatus?.status === 'cached' ? 'border-yellow-200 bg-yellow-50' :
          'border-blue-200 bg-blue-50'
        }>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {getStatusMessage()}
            {connectionStatus?.status !== 'live' && (
              <span className="block mt-1 text-sm">
                System will automatically connect to live data when available.
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Data Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Regulations Analyzed</p>
                  <p className="text-2xl font-bold text-gray-900">{data?.metrics?.totalRegulations || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data?.metrics?.totalClauses || 0} total clauses
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Financial Impact</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data?.metrics?.financialImpactClauses || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">clauses with quantified impact</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Analysis Confidence</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data?.metrics?.financialImpacts?.confidence || 0}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">AI analysis accuracy</p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cost Impact</p>
                  <p className="text-2xl font-bold text-gray-900">
                    £{Math.round((data?.metrics?.financialImpacts?.totalEstimatedCost || 0) / 1000000)}M
                  </p>
                  <p className="text-xs text-gray-500 mt-1">estimated regulatory costs</p>
                </div>
                <Database className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Source Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Capital Requirements Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Capital Requirements Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Clauses Analyzed:</span>
                  <Badge variant="secondary">
                    {data?.metrics?.clauseAnalysis?.capitalRequirements?.count || 0}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Confidence Score:</span>
                  <span className="text-sm text-gray-600">
                    {Math.round((data?.metrics?.clauseAnalysis?.capitalRequirements?.avgConfidence || 0) * 100)}%
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Sources:</p>
                  <div className="flex flex-wrap gap-1">
                    {(data?.metrics?.clauseAnalysis?.capitalRequirements?.sources || []).map((source: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>Financial Impact:</strong> £
                    {Math.round((data?.metrics?.financialImpacts?.breakdown?.capital?.amount || 0) / 1000000)}M
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Based on {data?.metrics?.financialImpacts?.breakdown?.capital?.regulations || 0} regulations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liquidity Requirements Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Liquidity Requirements Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Clauses Analyzed:</span>
                  <Badge variant="secondary">
                    {data?.metrics?.clauseAnalysis?.liquidityRequirements?.count || 0}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Confidence Score:</span>
                  <span className="text-sm text-gray-600">
                    {Math.round((data?.metrics?.clauseAnalysis?.liquidityRequirements?.avgConfidence || 0) * 100)}%
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Sources:</p>
                  <div className="flex flex-wrap gap-1">
                    {(data?.metrics?.clauseAnalysis?.liquidityRequirements?.sources || []).map((source: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>Financial Impact:</strong> £
                    {Math.round((data?.metrics?.financialImpacts?.breakdown?.liquidity?.amount || 0) / 1000000)}M
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Based on {data?.metrics?.financialImpacts?.breakdown?.liquidity?.regulations || 0} regulations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Regulatory Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Regulatory Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data?.metrics?.upcomingDeadlines || []).map((deadline: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div>
                      <h3 className="font-medium text-gray-900">{deadline.regulation}</h3>
                      <p className="text-sm text-gray-600">Source: {deadline.source}</p>
                      <p className="text-xs text-gray-500">
                        {deadline.clauses} clauses analyzed • {deadline.confidence}% confidence
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {new Date(deadline.deadline).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-600">
                      £{Math.round(deadline.impact / 1000000)}M impact
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Technical Status */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">System Status</h3>
                <p className="text-xs text-gray-600">
                  Data source: {connectionStatus?.status} • 
                  Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown'} •
                  Next sync: {connectionStatus?.status === 'live' ? 'Automatic' : 'When available'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {connectionStatus?.status === 'live' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RealDataIntegration;
