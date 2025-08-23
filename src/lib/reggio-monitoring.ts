// Production-Ready Monitoring System for Reggio Platform
// File: src/lib/reggio-monitoring.ts
// ADD THIS AS A NEW FILE - Does not modify existing code

import React, { useState, useEffect, useCallback } from 'react';

interface ErrorState {
  lastError: Error | null;
  retryCount: number;
  fallbackActive: boolean;
  timestamp: Date;
  operation: string;
}

interface PerformanceMetrics {
  operationName: string;
  avgDuration: number;
  errorRate: number;
  lastSuccessful: Date;
  totalCalls: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'error';
  errorCount: number;
  lastError: ErrorState | null;
  uptime: number;
  metrics: PerformanceMetrics[];
}

// Production-ready monitoring service
export class ReggioMonitoringService {
  private static instance: ReggioMonitoringService;
  private errors: ErrorState[] = [];
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private startTime: Date = new Date();
  private isEnabled: boolean = true;

  static getInstance(): ReggioMonitoringService {
    if (!ReggioMonitoringService.instance) {
      ReggioMonitoringService.instance = new ReggioMonitoringService();
    }
    return ReggioMonitoringService.instance;
  }

  // Wrap any async operation with monitoring
  async wrapOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    fallbackData?: T
  ): Promise<T> {
    if (!this.isEnabled) {
      return operation();
    }

    const startTime = performance.now();
    
    try {
      const result = await this.executeWithRetry(operation, 2);
      this.recordSuccess(operationName, performance.now() - startTime);
      return result;
    } catch (error) {
      this.recordError(operationName, error as Error);
      
      // Return fallback data if available
      if (fallbackData !== undefined) {
        console.warn(`Using fallback data for ${operationName}:`, error);
        return fallbackData;
      }
      
      throw error;
    }
  }

  // Execute with retry logic
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= maxRetries) {
          console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
          continue;
        }
        
        throw lastError;
      }
    }
    
    throw lastError!;
  }

  // Record successful operation
  private recordSuccess(operationName: string, duration: number) {
    const existing = this.metrics.get(operationName) || {
      operationName,
      avgDuration: 0,
      errorRate: 0,
      lastSuccessful: new Date(),
      totalCalls: 0
    };

    const newAvgDuration = existing.totalCalls === 0 
      ? duration 
      : (existing.avgDuration * existing.totalCalls + duration) / (existing.totalCalls + 1);

    this.metrics.set(operationName, {
      ...existing,
      avgDuration: newAvgDuration,
      errorRate: existing.errorRate * 0.95, // Decay error rate on success
      lastSuccessful: new Date(),
      totalCalls: existing.totalCalls + 1
    });
  }

  // Record error
  private recordError(operationName: string, error: Error) {
    const errorState: ErrorState = {
      lastError: error,
      retryCount: 0,
      fallbackActive: false,
      timestamp: new Date(),
      operation: operationName
    };

    this.errors.push(errorState);
    
    // Keep only last 50 errors
    if (this.errors.length > 50) {
      this.errors.shift();
    }

    // Update metrics
    const existing = this.metrics.get(operationName) || {
      operationName,
      avgDuration: 0,
      errorRate: 0,
      lastSuccessful: new Date(),
      totalCalls: 0
    };

    this.metrics.set(operationName, {
      ...existing,
      errorRate: Math.min(existing.errorRate + 0.1, 1), // Increase error rate
      totalCalls: existing.totalCalls + 1
    });

    // Send to external monitoring if configured
    this.sendTelemetry(operationName, errorState);
  }

  // Send telemetry data
  private sendTelemetry(operation: string, errorState: ErrorState) {
    // In production, this would send to your monitoring service
    // For now, structured console logging
    console.group(`🚨 Reggio Monitor: ${operation}`);
    console.error('Error:', errorState.lastError?.message);
    console.log('Timestamp:', errorState.timestamp.toISOString());
    console.log('Stack:', errorState.lastError?.stack);
    console.groupEnd();
  }

  // Get current health status
  getHealthStatus(): HealthStatus {
    const recentErrors = this.errors.filter(
      error => Date.now() - error.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    let status: 'healthy' | 'degraded' | 'error' = 'healthy';
    if (recentErrors.length > 0) {
      status = recentErrors.length > 5 ? 'error' : 'degraded';
    }

    return {
      status,
      errorCount: recentErrors.length,
      lastError: this.errors.length > 0 ? this.errors[this.errors.length - 1] : null,
      uptime: Date.now() - this.startTime.getTime(),
      metrics: Array.from(this.metrics.values())
    };
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Clear all metrics and errors
  reset() {
    this.errors = [];
    this.metrics.clear();
    this.startTime = new Date();
  }
}

// React Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ReggioErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private monitor = ReggioMonitoringService.getInstance();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Record error in monitoring system
    this.monitor['recordError']('react-error-boundary', error);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    console.error('Reggio Error Boundary:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  return (
    <div className="p-6 border border-red-200 rounded-lg bg-red-50 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-red-800 mb-2">
        Something went wrong
      </h2>
      <p className="text-red-600 mb-4">
        We encountered an issue. You can try again or refresh the page.
      </p>
      <div className="flex space-x-3">
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
      {error && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-red-800 hover:text-red-900">
            Technical Details
          </summary>
          <pre className="mt-2 text-red-600 whitespace-pre-wrap bg-red-100 p-2 rounded">
            {error.message}
          </pre>
        </details>
      )}
    </div>
  );
}

// Health indicator component
interface HealthIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export function HealthIndicator({ showDetails = false, className = "" }: HealthIndicatorProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const monitor = ReggioMonitoringService.getInstance();

  useEffect(() => {
    const updateHealth = () => {
      setHealth(monitor.getHealthStatus());
    };

    updateHealth();
    const interval = setInterval(updateHealth, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [monitor]);

  if (!health) return null;

  const getStatusColor = () => {
    switch (health.status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-1 text-xs ${getStatusColor()} ${className}`}>
        <span>{getStatusIcon()}</span>
        <span className="capitalize">{health.status}</span>
      </div>
    );
  }

  return (
    <div className={`p-3 border rounded-lg bg-gray-50 ${className}`}>
      <div className={`flex items-center space-x-2 font-medium ${getStatusColor()} mb-2`}>
        <span>{getStatusIcon()}</span>
        <span className="capitalize">System Status: {health.status}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
        <div>
          <span className="font-medium">Uptime:</span>
          <span className="ml-1">{Math.floor(health.uptime / 1000 / 60)} min</span>
        </div>
        <div>
          <span className="font-medium">Errors:</span>
          <span className="ml-1">{health.errorCount}</span>
        </div>
        <div>
          <span className="font-medium">Operations:</span>
          <span className="ml-1">{health.metrics.length}</span>
        </div>
        <div>
          <span className="font-medium">Avg Response:</span>
          <span className="ml-1">
            {health.metrics.length > 0 
              ? `${Math.round(health.metrics.reduce((sum, m) => sum + m.avgDuration, 0) / health.metrics.length)}ms`
              : 'N/A'
            }
          </span>
        </div>
      </div>

      {health.lastError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <div className="text-red-800 font-medium">Last Error:</div>
          <div className="text-red-600">{health.lastError.lastError?.message}</div>
          <div className="text-red-500">{health.lastError.timestamp.toLocaleTimeString()}</div>
        </div>
      )}
    </div>
  );
}

// Hook for using monitoring in components
export function useMonitoring() {
  const monitor = ReggioMonitoringService.getInstance();
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    const updateHealth = () => {
      setHealth(monitor.getHealthStatus());
    };

    updateHealth();
    const interval = setInterval(updateHealth, 10000);
    return () => clearInterval(interval);
  }, [monitor]);

  return {
    health,
    wrapOperation: monitor.wrapOperation.bind(monitor),
    isHealthy: health?.status === 'healthy',
    hasErrors: (health?.errorCount || 0) > 0
  };
}

// Export singleton instance
export const reggioMonitor = ReggioMonitoringService.getInstance();
