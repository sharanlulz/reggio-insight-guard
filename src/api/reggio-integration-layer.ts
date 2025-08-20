// Reggio API & Integration Layer
// Complete REST API endpoints, webhooks, and multi-tenant architecture
// File: src/api/reggio-integration-layer.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp: string;
  };
}

interface RegulatoryMetric {
  id: string;
  orgId: string;
  metricType: 'LCR' | 'TIER1' | 'LEVERAGE' | 'NSFR' | 'CAPITAL_ADEQUACY';
  currentValue: number;
  requiredValue: number;
  buffer: number;
  status: 'COMPLIANT' | 'WARNING' | 'BREACH';
  lastUpdated: string;
  regulatorySource: string;
  confidence: number;
}

interface RegulatoryAlert {
  id: string;
  orgId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  regulationId: string;
  impact: {
    financial: string;
    operational: string;
    timeline: string;
  };
  actionRequired: boolean;
  deadline?: string;
  acknowledged: boolean;
  createdAt: string;
}

interface ComplianceReport {
  id: string;
  orgId: string;
  reportType: 'BOARD_BRIEF' | 'REGULATORY_FILING' | 'STRESS_TEST' | 'CUSTOM';
  title: string;
  regulations: string[];
  metrics: RegulatoryMetric[];
  insights: string[];
  recommendations: string[];
  generatedAt: string;
  format: 'PDF' | 'EXCEL' | 'JSON';
  downloadUrl?: string;
}

interface WebhookEvent {
  id: string;
  type: 'REGULATION_CHANGE' | 'METRIC_BREACH' | 'NEW_REQUIREMENT' | 'DEADLINE_APPROACHING';
  orgId: string;
  data: any;
  timestamp: string;
  retryCount: number;
}

interface OrganizationConfig {
  id: string;
  name: string;
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    customCss?: string;
  };
  settings: {
    autoAlerts: boolean;
    reportFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    webhookUrls: string[];
    apiRateLimit: number;
  };
  subscription: {
    tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
    features: string[];
    expiresAt: string;
  };
}

// ============================================================================
// REGGIO API CLIENT
// ============================================================================

export class ReggioApiClient {
  private supabase: SupabaseClient<Database>;
  private orgId: string;
  private apiKey: string;

  constructor(supabaseUrl: string, serviceKey: string, orgId: string, apiKey: string) {
    this.supabase = createClient(supabaseUrl, serviceKey);
    this.orgId = orgId;
    this.apiKey = apiKey;
  }

  private async authenticateRequest(headers: Record<string, string>): Promise<boolean> {
    const authHeader = headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) return false;
    
    const token = authHeader.split(' ')[1];
    return token === this.apiKey; // In production, validate against database
  }

  private createResponse<T>(success: boolean, data?: T, error?: string): ApiResponse<T> {
    return {
      success,
      data,
      error,
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  // ============================================================================
  // REGULATORY METRICS ENDPOINTS
  // ============================================================================

  async getMetrics(filters?: {
    metricType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<RegulatoryMetric[]>> {
    try {
      let query = this.supabase
        .from('regulatory_metrics')
        .select('*')
        .eq('org_id', this.orgId)
        .order('last_updated', { ascending: false });

      if (filters?.metricType) {
        query = query.eq('metric_type', filters.metricType);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('last_updated', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('last_updated', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const metrics: RegulatoryMetric[] = data.map(row => ({
        id: row.id,
        orgId: row.org_id,
        metricType: row.metric_type as any,
        currentValue: row.current_value,
        requiredValue: row.required_value,
        buffer: row.buffer,
        status: row.status as any,
        lastUpdated: row.last_updated,
        regulatorySource: row.regulatory_source,
        confidence: row.confidence
      }));

      return this.createResponse(true, metrics);
    } catch (error) {
      return this.createResponse(false, undefined, error.message);
    }
  }

  async updateMetric(metricId: string, updates: Partial<RegulatoryMetric>): Promise<ApiResponse<RegulatoryMetric>> {
    try {
      const { data, error } = await this.supabase
        .from('regulatory_metrics')
        .update({
          current_value: updates.currentValue,
          required_value: updates.requiredValue,
          buffer: updates.buffer,
          status: updates.status,
          confidence: updates.confidence,
          last_updated: new Date().toISOString()
        })
        .eq('id', metricId)
        .eq('org_id', this.orgId)
        .select()
        .single();

      if (error) throw error;

      const metric: RegulatoryMetric = {
        id: data.id,
        orgId: data.org_id,
        metricType: data.metric_type,
        currentValue: data.current_value,
        requiredValue: data.required_value,
        buffer: data.buffer,
        status: data.status,
        lastUpdated: data.last_updated,
        regulatorySource: data.regulatory_source,
        confidence: data.confidence
      };

      return this.createResponse(true, metric);
    } catch (error) {
      return this.createResponse(false, undefined, error.message);
    }
  }

  // ============================================================================
  // REGULATORY ALERTS ENDPOINTS
  // ============================================================================

  async getAlerts(filters?: {
    severity?: string;
    acknowledged?: boolean;
    limit?: number;
  }): Promise<ApiResponse<RegulatoryAlert[]>> {
    try {
      let query = this.supabase
        .from('regulatory_alerts')
        .select('*')
        .eq('org_id', this.orgId)
        .order('created_at', { ascending: false });

      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.acknowledged !== undefined) {
        query = query.eq('acknowledged', filters.acknowledged);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      const alerts: RegulatoryAlert[] = data.map(row => ({
        id: row.id,
        orgId: row.org_id,
        severity: row.severity,
        title: row.title,
        description: row.description,
        regulationId: row.regulation_id,
        impact: row.impact,
        actionRequired: row.action_required,
        deadline: row.deadline,
        acknowledged: row.acknowledged,
        createdAt: row.created_at
      }));

      return this.createResponse(true, alerts);
    } catch (error) {
      return this.createResponse(false, undefined, error.message);
    }
  }

  async acknowledgeAlert(alertId: string): Promise<ApiResponse<RegulatoryAlert>> {
    try {
      const { data, error } = await this.supabase
        .from('regulatory_alerts')
        .update({ 
          acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .eq('org_id', this.orgId)
        .select()
        .single();

      if (error) throw error;

      const alert: RegulatoryAlert = {
        id: data.id,
        orgId: data.org_id,
        severity: data.severity,
        title: data.title,
        description: data.description,
        regulationId: data.regulation_id,
        impact: data.impact,
        actionRequired: data.action_required,
        deadline: data.deadline,
        acknowledged: data.acknowledged,
        createdAt: data.created_at
      };

      return this.createResponse(true, alert);
    } catch (error) {
      return this.createResponse(false, undefined, error.message);
    }
  }

  // ============================================================================
  // COMPLIANCE REPORTS ENDPOINTS
  // ============================================================================

  async generateReport(config: {
    type: 'BOARD_BRIEF' | 'REGULATORY_FILING' | 'STRESS_TEST' | 'CUSTOM';
    title: string;
    regulations?: string[];
    format: 'PDF' | 'EXCEL' | 'JSON';
    includeMetrics?: boolean;
    includeTrends?: boolean;
    includeRecommendations?: boolean;
  }): Promise<ApiResponse<ComplianceReport>> {
    try {
      // Generate report content based on current data
      const metricsResponse = await this.getMetrics();
      const alertsResponse = await this.getAlerts({ acknowledged: false });

      const reportData = {
        org_id: this.orgId,
        report_type: config.type,
        title: config.title,
        regulations: config.regulations || [],
        metrics: metricsResponse.data || [],
        insights: this.generateInsights(metricsResponse.data || [], alertsResponse.data || []),
        recommendations: this.generateRecommendations(metricsResponse.data || []),
        format: config.format,
        generated_at: new Date().toISOString(),
        status: 'GENERATING'
      };

      const { data, error } = await this.supabase
        .from('compliance_reports')
        .insert(reportData)
        .select()
        .single();

      if (error) throw error;

      // Trigger async report generation
      this.processReportGeneration(data.id, config);

      const report: ComplianceReport = {
        id: data.id,
        orgId: data.org_id,
        reportType: data.report_type,
        title: data.title,
        regulations: data.regulations,
        metrics: data.metrics,
        insights: data.insights,
        recommendations: data.recommendations,
        generatedAt: data.generated_at,
        format: data.format
      };

      return this.createResponse(true, report);
    } catch (error) {
      return this.createResponse(false, undefined, error.message);
    }
  }

  async getReports(limit: number = 10): Promise<ApiResponse<ComplianceReport[]>> {
    try {
      const { data, error } = await this.supabase
        .from('compliance_reports')
        .select('*')
        .eq('org_id', this.orgId)
        .order('generated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const reports: ComplianceReport[] = data.map(row => ({
        id: row.id,
        orgId: row.org_id,
        reportType: row.report_type,
        title: row.title,
        regulations: row.regulations,
        metrics: row.metrics,
        insights: row.insights,
        recommendations: row.recommendations,
        generatedAt: row.generated_at,
        format: row.format,
        downloadUrl: row.download_url
      }));

      return this.createResponse(true, reports);
    } catch (error) {
      return this.createResponse(false, undefined, error.message);
    }
  }

  // ============================================================================
  // PORTFOLIO DATA ENDPOINTS
  // ============================================================================

  async uploadPortfolioData(portfolioData: {
    name: string;
    assets: Array<{
      assetId: string;
      assetClass: string;
      marketValue: number;
      notionalValue?: number;
      maturityDate?: string;
      rating?: string;
      jurisdiction: string;
      sector?: string;
      counterparty?: string;
      baselRiskWeight?: number;
      liquidityClassification?: string;
    }>;
  }): Promise<ApiResponse<{ portfolioSnapshotId: string }>> {
    try {
      // Create portfolio snapshot
      const { data: snapshot, error: snapshotError } = await this.supabase
        .from('portfolio_snapshots')
        .insert({
          org_id: this.orgId,
          snapshot_date: new Date().toISOString(),
          portfolio_name: portfolioData.name
        })
        .select()
        .single();

      if (snapshotError) throw snapshotError;

      // Insert portfolio assets
      const assetRows = portfolioData.assets.map(asset => ({
        portfolio_snapshot_id: snapshot.id,
        asset_id: asset.assetId,
        asset_class: asset.assetClass,
        market_value: asset.marketValue,
        notional_value: asset.notionalValue,
        maturity_date: asset.maturityDate,
        rating: asset.rating,
        jurisdiction: asset.jurisdiction,
        sector: asset.sector,
        counterparty: asset.counterparty,
        basel_risk_weight: asset.baselRiskWeight,
        liquidity_classification: asset.liquidityClassification
      }));

      const { error: assetsError } = await this.supabase
        .from('portfolio_assets')
        .insert(assetRows);

      if (assetsError) throw assetsError;

      // Trigger regulatory impact recalculation
      this.triggerPortfolioAnalysis(snapshot.id);

      return this.createResponse(true, { portfolioSnapshotId: snapshot.id });
    } catch (error) {
      return this.createResponse(false, undefined, error.message);
    }
  }

  // ============================================================================
  // WEBHOOK MANAGEMENT
  // ============================================================================

  async registerWebhook(webhookUrl: string, events: string[]): Promise<ApiResponse<{ webhookId: string }>> {
    try {
      const { data, error } = await this.supabase
        .from('webhooks')
        .insert({
          org_id: this.orgId,
          url: webhookUrl,
          events: events,
          active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return this.createResponse(true, { webhookId: data.id });
    } catch (error) {
      return this.createResponse(false, undefined, error.message);
    }
  }

  async triggerWebhook(event: WebhookEvent): Promise<void> {
    try {
      // Get active webhooks for this organization
      const { data: webhooks } = await this.supabase
        .from('webhooks')
        .select('*')
        .eq('org_id', event.orgId)
        .eq('active', true)
        .contains('events', [event.type]);

      // Send webhooks in parallel
      const webhookPromises = webhooks?.map(webhook => 
        this.sendWebhook(webhook.url, event)
      ) || [];

      await Promise.allSettled(webhookPromises);
    } catch (error) {
      console.error('Webhook trigger error:', error);
    }
  }

  private async sendWebhook(url: string, event: WebhookEvent): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Reggio-Event': event.type,
          'X-Reggio-Timestamp': event.timestamp,
          'X-Reggio-Signature': this.generateWebhookSignature(event)
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`Webhook delivery failed to ${url}:`, error);
      // Log failed webhook for retry
      await this.logWebhookFailure(url, event, error.message);
    }
  }

  private generateWebhookSignature(event: WebhookEvent): string {
    // In production, use HMAC-SHA256 with secret key
    return 'sha256=' + Buffer.from(JSON.stringify(event)).toString('base64');
  }

  private async logWebhookFailure(url: string, event: WebhookEvent, error: string): Promise<void> {
    await this.supabase
      .from('webhook_logs')
      .insert({
        org_id: event.orgId,
        webhook_url: url,
        event_type: event.type,
        event_data: event.data,
        error_message: error,
        retry_count: event.retryCount + 1,
        created_at: new Date().toISOString()
      });
  }

  // ============================================================================
  // MULTI-TENANT CONFIGURATION
  // ============================================================================

  async getOrganizationConfig(): Promise<ApiResponse<OrganizationConfig>> {
    try {
      const { data, error } = await this.supabase
        .from('organization_configs')
        .select('*')
        .eq('org_id', this.orgId)
        .single();

      if (error) throw error;

      const config: OrganizationConfig = {
        id: data.org_id,
        name: data.organization_name,
        branding: data.branding,
        settings: data.settings,
        subscription: data.subscription
      };

      return this.createResponse(true, config);
    } catch (error) {
      return this.createResponse(false, undefined, error.message);
    }
  }

  async updateOrganizationConfig(updates: Partial<OrganizationConfig>): Promise<ApiResponse<OrganizationConfig>> {
    try {
      const { data, error } = await this.supabase
        .from('organization_configs')
        .update({
          organization_name: updates.name,
          branding: updates.branding,
          settings: updates.settings,
          subscription: updates.subscription,
          updated_at: new Date().toISOString()
        })
        .eq('org_id', this.orgId)
        .select()
        .single();

      if (error) throw error;

      const config: OrganizationConfig = {
        id: data.org_id,
        name: data.organization_name,
        branding: data.branding,
        settings: data.settings,
        subscription: data.subscription
      };

      return this.createResponse(true, config);
    } catch (error) {
      return this.createResponse(false, undefined, error.message);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateInsights(metrics: RegulatoryMetric[], alerts: RegulatoryAlert[]): string[] {
    const insights: string[] = [];
    
    // LCR insights
    const lcrMetric = metrics.find(m => m.metricType === 'LCR');
    if (lcrMetric && lcrMetric.buffer < 5) {
      insights.push(`LCR buffer of ${lcrMetric.buffer.toFixed(1)}% is below recommended 5% minimum`);
    }

    // Critical alerts insight
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
    if (criticalAlerts.length > 0) {
      insights.push(`${criticalAlerts.length} critical regulatory alerts require immediate attention`);
    }

    // Compliance trend insight
    const breachedMetrics = metrics.filter(m => m.status === 'BREACH');
    if (breachedMetrics.length > 0) {
      insights.push(`${breachedMetrics.length} regulatory metrics currently in breach status`);
    }

    return insights;
  }

  private generateRecommendations(metrics: RegulatoryMetric[]): string[] {
    const recommendations: string[] = [];
    
    // Capital recommendations
    const tier1Metric = metrics.find(m => m.metricType === 'TIER1');
    if (tier1Metric && tier1Metric.buffer < 2) {
      recommendations.push('Consider capital raising to improve Tier 1 buffer above 2%');
    }

    // Liquidity recommendations
    const lcrMetric = metrics.find(m => m.metricType === 'LCR');
    if (lcrMetric && lcrMetric.buffer < 5) {
      recommendations.push('Increase HQLA holdings to improve LCR buffer to target 5%');
    }

    // General compliance
    recommendations.push('Schedule quarterly regulatory review meetings with board');
    recommendations.push('Implement automated monitoring for all critical metrics');

    return recommendations;
  }

  private async processReportGeneration(reportId: string, config: any): Promise<void> {
    // This would typically be handled by a background job
    setTimeout(async () => {
      try {
        // Simulate report generation
        const downloadUrl = `https://reports.reggio.ai/${reportId}.${config.format.toLowerCase()}`;
        
        await this.supabase
          .from('compliance_reports')
          .update({
            status: 'COMPLETED',
            download_url: downloadUrl,
            completed_at: new Date().toISOString()
          })
          .eq('id', reportId);

        // Trigger webhook for report completion
        await this.triggerWebhook({
          id: crypto.randomUUID(),
          type: 'REPORT_GENERATED',
          orgId: this.orgId,
          data: { reportId, downloadUrl },
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
      } catch (error) {
        console.error('Report generation failed:', error);
      }
    }, 5000); // 5 second delay to simulate processing
  }

  private async triggerPortfolioAnalysis(portfolioSnapshotId: string): Promise<void> {
    // This would trigger the financial modeling engine
    setTimeout(async () => {
      await this.triggerWebhook({
        id: crypto.randomUUID(),
        type: 'PORTFOLIO_ANALYSIS_COMPLETE',
        orgId: this.orgId,
        data: { portfolioSnapshotId },
        timestamp: new Date().toISOString(),
        retryCount: 0
      });
    }, 10000); // 10 second delay for analysis
  }
}

// ============================================================================
// EXPRESS.JS INTEGRATION EXAMPLE
// ============================================================================

// Example Express.js routes for the API
export const createReggioApiRoutes = (app: any, client: ReggioApiClient) => {
  
  // Middleware for API authentication
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    // Add authentication logic here
    next();
  };

  // GET /api/metrics - Get regulatory metrics
  app.get('/api/metrics', authenticate, async (req: any, res: any) => {
    const result = await client.getMetrics(req.query);
    res.status(result.success ? 200 : 400).json(result);
  });

  // PUT /api/metrics/:id - Update metric
  app.put('/api/metrics/:id', authenticate, async (req: any, res: any) => {
    const result = await client.updateMetric(req.params.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  });

  // GET /api/alerts - Get regulatory alerts
  app.get('/api/alerts', authenticate, async (req: any, res: any) => {
    const result = await client.getAlerts(req.query);
    res.status(result.success ? 200 : 400).json(result);
  });

  // POST /api/alerts/:id/acknowledge - Acknowledge alert
  app.post('/api/alerts/:id/acknowledge', authenticate, async (req: any, res: any) => {
    const result = await client.acknowledgeAlert(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  });

  // POST /api/reports - Generate compliance report
  app.post('/api/reports', authenticate, async (req: any, res: any) => {
    const result = await client.generateReport(req.body);
    res.status(result.success ? 201 : 400).json(result);
  });

  // GET /api/reports - Get compliance reports
  app.get('/api/reports', authenticate, async (req: any, res: any) => {
    const result = await client.getReports(req.query.limit);
    res.status(result.success ? 200 : 400).json(result);
  });

  // POST /api/portfolio - Upload portfolio data
  app.post('/api/portfolio', authenticate, async (req: any, res: any) => {
    const result = await client.uploadPortfolioData(req.body);
    res.status(result.success ? 201 : 400).json(result);
  });

  // POST /api/webhooks - Register webhook
  app.post('/api/webhooks', authenticate, async (req: any, res: any) => {
    const result = await client.registerWebhook(req.body.url, req.body.events);
    res.status(result.success ? 201 : 400).json(result);
  });

  // GET /api/organization - Get organization config
  app.get('/api/organization', authenticate, async (req: any, res: any) => {
    const result = await client.getOrganizationConfig();
    res.status(result.success ? 200 : 400).json(result);
  });

  // PUT /api/organization - Update organization config
  app.put('/api/organization', authenticate, async (req: any, res: any) => {
    const result = await client.updateOrganizationConfig(req.body);
    res.status(result.success ? 200 : 400).json(result);
  });
};

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
// Initialize the API client
const reggioClient = new ReggioApiClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  'org-uuid',
  'api-key'
);

// Express.js setup
import express from 'express';
const app = express();
app.use(express.json());

createReggioApiRoutes(app, reggioClient);

app.listen(3000, () => {
  console.log('Reggio API running on port 3000');
});

// Customer integration example:
const customerApi = async () => {
  // Get current metrics
  const metrics = await fetch('/api/metrics', {
    headers: { 'Authorization': 'Bearer customer-api-key' }
  });

  // Upload portfolio data
  const portfolioData = {
    name: 'Q4 2024 Portfolio',
    assets: [
      {
        assetId: 'GB00123456789',
        assetClass: 'SOVEREIGN',
        marketValue: 100000000,
        jurisdiction: 'UK',
        rating: 'AAA'
      }
    ]
  };

  await fetch('/api/portfolio', {
    method: 'POST',
    headers: { 
      'Authorization': 'Bearer customer-api-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(portfolioData)
  });

  // Generate board report
  await fetch('/api/reports', {
    method: 'POST',
    headers: { 
      'Authorization': 'Bearer customer-api-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'BOARD_BRIEF',
      title: 'Q4 2024 Regulatory Summary',
      format: 'PDF',
      includeMetrics: true,
      includeRecommendations: true
    })
  });
};
*/
