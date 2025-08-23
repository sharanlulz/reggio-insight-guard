// Enhanced Monitoring & Error Handling Layer for Reggio
// File: src/lib/reggio-monitoring.ts
// This is ADDITIVE - wraps existing functionality without changing it

interface ErrorState {
  lastError: Error | null;
  retryCount: number;
  fallbackActive: boolean;
  timestamp: Date;
}

interface PerformanceMetrics {
  pageLoadTime: number;
  dataFetchTime: number;
  renderTime: number;
  errorRate: number;
}

interface MonitoringConfig {
  enableAnalytics: boolean;
  enableErrorTracking: boolean;
  enablePerformanceMonitoring: boolean;
  retryAttempts: number;
  retryDelay: number;
}

// Enhanced error boundary that wraps existing components
export class ReggioMonitoringService {
  private static instance: ReggioMonitoringService;
  private config: MonitoringConfig;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private errors: ErrorState[] = [];

  constructor(config: MonitoringConfig = {
    enableAnalytics: true,
    enableErrorTracking: true,
    enablePerformanceMonitoring: true,
    retryAttempts: 3,
    retryDelay: 1000
  }) {
    this.config = config;
  }

  static getInstance(config?: MonitoringConfig): ReggioMonitoringService {
    if (!ReggioMonitoringService.instance) {
      ReggioMonitoringService.instance = new ReggioMonitoringService(config);
    }
    return ReggioMonitoringService.instance;
  }

  // Wraps existing data fetching functions with monitoring
  async wrapDataFetch<T>(
    operation: string,
    fetcher: () => Promise<T>,
    fallbackData?: T
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await this.retryWithBackoff(fetcher);
      
      if (this.config.enablePerformanceMonitoring) {
        this.recordPerformance(operation, performance.now() - startTime, true);
      }
      
      return result;
    } catch (error) {
      if (this.config.enableErrorTracking) {
        this.recordError(operation, error as Error);
      }
      
      // Return fallback data if available, otherwise rethrow
      if (fallbackData !== undefined) {
        console.warn(`Using fallback data for ${operation}:`, error);
        return fallbackData;
      }
      
      throw error;
    }
  }

  // Retry logic with exponential backoff
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(operation, attempt + 1);
      }
      throw error;
    }
  }

  // Record performance metrics
  private recordPerformance(operation: string, duration: number, success: boolean) {
    const existing = this.metrics.get(operation) || {
      pageLoadTime: 0,
      dataFetchTime: 0,
      renderTime: 0,
      errorRate: 0
    };

    const updated = {
      ...existing,
      dataFetchTime: duration,
      errorRate: success ? existing.errorRate * 0.9 : existing.errorRate * 1.1 + 0.1
    };

    this.metrics.set(operation, updated);
  }

  // Record errors without breaking functionality
  private recordError(operation: string, error: Error) {
    const errorState: ErrorState = {
      lastError: error,
      retryCount: 0,
      fallbackActive: false,
      timestamp: new Date()
    };

    this.errors.push(errorState);
    
    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors.shift();
    }

    // Send to monitoring service (if configured)
    this.sendToMonitoringService(operation, errorState);
  }

  // Send telemetry data to external monitoring
  private sendToMonitoringService(operation: string, errorState: ErrorState) {
    // This would integrate with services like Sentry, DataDog, etc.
    // For now, just console logging
    console.group(`🔍 Reggio Monitoring: ${operation}`);
    console.error('Error:', errorState.lastError?.message);
    console.log('Timestamp:', errorState.timestamp);
    console.log('Stack:', errorState.lastError?.stack);
    console.groupEnd();
  }

  // Get current health status
  getHealthStatus() {
    const recentErrors = this.errors.filter(
      error => Date.now() - error.timestamp.getTime() < 5 * 60 * 1000
    );

    return {
      status: recentErrors.length === 0 ? 'healthy' : 'degraded',
      errorCount: recentErrors.length,
      lastError: this.errors[this.errors.length - 1],
      metrics: Object.fromEntries(this.metrics.entries())
    };
  }

  // Enhanced hook wrapper that preserves existing behavior
  wrapHook<T>(hookName: string, hookFn: () => T): T {
    try {
      const startTime = performance.now();
      const result = hookFn();
      
      if (this.config.enablePerformanceMonitoring) {
        this.recordPerformance(hookName, performance.now() - startTime, true);
      }
      
      return result;
    } catch (error) {
      if (this.config.enableErrorTracking) {
        this.recordError(hookName, error as Error);
      }
      throw error; // Re-throw to maintain existing error behavior
    }
  }
}

// Enhanced version of useFinancialData that wraps the existing one
export function useEnhancedFinancialData() {
  const monitor = ReggioMonitoringService.getInstance();
  
  // Import the existing hook (this preserves all existing behavior)
  // const originalData = useFinancialData();
  
  // For now, we'll create a wrapper that adds monitoring
  return monitor.wrapHook('useFinancialData', () => {
    // This would call the original useFinancialData hook
    // and wrap its data fetching with monitoring
    
    // Placeholder - in implementation, this would wrap the actual hook
    return {
      loading: false,
      keyMetrics: {},
      lcrData: {},
      capitalData: {},
      stressResults: [],
      lastUpdated: new Date(),
      refresh: () => monitor.wrapDataFetch('financial-refresh', async () => {
        // Wrap the original refresh function
        console.log('Refreshing financial data with monitoring...');
      })
    };
  });
}

// Health check component that can be added to any page
export interface HealthCheckProps {
  showDetails?: boolean;
  className?: string;
}

export function HealthCheck({ showDetails = false, className = "" }: HealthCheckProps) {
  const monitor = ReggioMonitoringService.getInstance();
  const [health, setHealth] = React.useState(monitor.getHealthStatus());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setHealth(monitor.getHealthStatus());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [monitor]);

  const statusColor = health.status === 'healthy' ? 'text-green-600' : 'text-yellow-600';
  const statusIcon = health.status === 'healthy' ? '🟢' : '🟡';

  if (!showDetails) {
    return (
      <div className={`text-xs ${statusColor} ${className}`}>
        {statusIcon} {health.status}
      </div>
    );
  }

  return (
    <div className={`p-2 border rounded text-xs ${className}`}>
      <div className={`font-semibold ${statusColor}`}>
        {statusIcon} System Status: {health.status}
      </div>
      {health.errorCount > 0 && (
        <div className="text-red-600 mt-1">
          {health.errorCount} recent errors
        </div>
      )}
      {Object.keys(health.metrics).length > 0 && (
        <div className="mt-1 text-gray-500">
          Monitoring {Object.keys(health.metrics).length} operations
        </div>
      )}
    </div>
  );
}

// Error boundary component that wraps existing components
export class ReggioErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<any> },
  { hasError: boolean; error?: Error }
> {
  private monitor = ReggioMonitoringService.getInstance();

  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.monitor['recordError']('react-error-boundary', error);
    console.error('Reggio Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
function DefaultErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="p-6 border border-red-200 rounded-lg bg-red-50">
      <h2 className="text-lg font-semibold text-red-800 mb-2">
        Something went wrong
      </h2>
      <p className="text-red-600 mb-4">
        We encountered an error while loading this section. Please try refreshing the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Refresh Page
      </button>
      {error && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-red-800">Technical Details</summary>
          <pre className="mt-2 text-red-600 whitespace-pre-wrap">
            {error.message}
          </pre>
        </details>
      )}
    </div>
  );
}

// Export the monitoring instance for use throughout the app
export const reggioMonitor = ReggioMonitoringService.getInstance();
