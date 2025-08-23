// Reggio Platform: Safe Migration Strategy
// File: src/lib/reggio-migration.ts
// Allows gradual adoption of improvements without breaking changes

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, CheckCircle, Settings, Zap } from 'lucide-react';

// Feature flags for gradual rollout
interface FeatureFlags {
  enhancedDashboard: boolean;
  improvedMonitoring: boolean;
  advancedAnalytics: boolean;
  betterErrorHandling: boolean;
  performanceOptimizations: boolean;
  visualImprovements: boolean;
}

// Migration status tracking
interface MigrationStatus {
  userId?: string;
  enrolledFeatures: string[];
  lastUpdate: Date;
  feedbackSubmitted: boolean;
  rollbackCount: number;
}

// Safe migration manager
export class ReggioMigrationManager {
  private static instance: ReggioMigrationManager;
  private featureFlags: FeatureFlags;
  private migrationStatus: MigrationStatus;
  private rollbackHandlers: Map<string, () => void> = new Map();

  constructor() {
    this.featureFlags = this.loadFeatureFlags();
    this.migrationStatus = this.loadMigrationStatus();
  }

  static getInstance(): ReggioMigrationManager {
    if (!ReggioMigrationManager.instance) {
      ReggioMigrationManager.instance = new ReggioMigrationManager();
    }
    return ReggioMigrationManager.instance;
  }

  // Load feature flags from localStorage with safe defaults
  private loadFeatureFlags(): FeatureFlags {
    try {
      const stored = localStorage.getItem('reggio-feature-flags');
      if (stored) {
        return { ...this.getDefaultFlags(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Could not load feature flags:', error);
    }
    return this.getDefaultFlags();
  }

  private getDefaultFlags(): FeatureFlags {
    return {
      enhancedDashboard: false, // Start disabled for safety
      improvedMonitoring: true,  // Safe to enable
      advancedAnalytics: false,
      betterErrorHandling: true, // Safe to enable
      performanceOptimizations: true, // Safe to enable
      visualImprovements: false
    };
  }

  // Load migration status
  private loadMigrationStatus(): MigrationStatus {
    try {
      const stored = localStorage.getItem('reggio-migration-status');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          lastUpdate: new Date(parsed.lastUpdate)
        };
      }
    } catch (error) {
      console.warn('Could not load migration status:', error);
    }
    return {
      enrolledFeatures: [],
      lastUpdate: new Date(),
      feedbackSubmitted: false,
      rollbackCount: 0
    };
  }

  // Save settings to localStorage
  private saveSettings(): void {
    try {
      localStorage.setItem('reggio-feature-flags', JSON.stringify(this.featureFlags));
      localStorage.setItem('reggio-migration-status', JSON.stringify(this.migrationStatus));
    } catch (error) {
      console.warn('Could not save migration settings:', error);
    }
  }

  // Check if a feature is enabled
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.featureFlags[feature] || false;
  }

  // Enable a feature with safety checks
  enableFeature(feature: keyof FeatureFlags, rollbackHandler?: () => void): boolean {
    try {
      // Add to enrolled features if not already there
      if (!this.migrationStatus.enrolledFeatures.includes(feature)) {
        this.migrationStatus.enrolledFeatures.push(feature);
      }

      // Register rollback handler if provided
      if (rollbackHandler) {
        this.rollbackHandlers.set(feature, rollbackHandler);
      }

      this.featureFlags[feature] = true;
      this.migrationStatus.lastUpdate = new Date();
      this.saveSettings();

      console.log(`✅ Feature enabled: ${feature}`);
      return true;
    } catch (error) {
      console.error(`Failed to enable feature ${feature}:`, error);
      return false;
    }
  }

  // Disable a feature safely
  disableFeature(feature: keyof FeatureFlags): boolean {
    try {
      this.featureFlags[feature] = false;
      
      // Execute rollback handler if available
      const rollbackHandler = this.rollbackHandlers.get(feature);
      if (rollbackHandler) {
        rollbackHandler();
      }

      this.migrationStatus.rollbackCount++;
      this.migrationStatus.lastUpdate = new Date();
      this.saveSettings();

      console.log(`⏪ Feature disabled: ${feature}`);
      return true;
    } catch (error) {
      console.error(`Failed to disable feature ${feature}:`, error);
      return false;
    }
  }

  // Get migration status
  getMigrationStatus(): MigrationStatus {
    return { ...this.migrationStatus };
  }

  // Reset all features to default (emergency rollback)
  resetAllFeatures(): void {
    console.warn('🚨 Emergency rollback: Resetting all features to default');
    
    this.featureFlags = this.getDefaultFlags();
    this.migrationStatus.rollbackCount++;
    this.migrationStatus.lastUpdate = new Date();
    
    // Execute all rollback handlers
    this.rollbackHandlers.forEach((handler, feature) => {
      try {
        handler();
        console.log(`Rolled back feature: ${feature}`);
      } catch (error) {
        console.error(`Failed to rollback feature ${feature}:`, error);
      }
    });

    this.saveSettings();
    
    // Reload the page to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

// React hook for using the migration manager
export function useMigration() {
  const [manager] = useState(() => ReggioMigrationManager.getInstance());
  const [, forceUpdate] = useState({});

  // Force re-render when features change
  const refresh = useCallback(() => {
    forceUpdate({});
  }, []);

  return {
    isFeatureEnabled: (feature: keyof FeatureFlags) => manager.isFeatureEnabled(feature),
    enableFeature: (feature: keyof FeatureFlags, rollback?: () => void) => {
      const result = manager.enableFeature(feature, rollback);
      refresh();
      return result;
    },
    disableFeature: (feature: keyof FeatureFlags) => {
      const result = manager.disableFeature(feature);
      refresh();
      return result;
    },
    resetAllFeatures: () => {
      manager.resetAllFeatures();
      refresh();
    },
    getMigrationStatus: () => manager.getMigrationStatus()
  };
}

// Component for managing feature flags (admin/developer use)
export function FeatureManagerPanel() {
  const migration = useMigration();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const status = migration.getMigrationStatus();

  const features: Array<{
    key: keyof FeatureFlags;
    name: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
    stable: boolean;
  }> = [
    {
      key: 'betterErrorHandling',
      name: 'Enhanced Error Handling',
      description: 'Improved error boundaries and recovery mechanisms',
      risk: 'low',
      stable: true
    },
    {
      key: 'improvedMonitoring',
      name: 'System Monitoring',
      description: 'Real-time performance and health monitoring',
      risk: 'low',
      stable: true
    },
    {
      key: 'performanceOptimizations',
      name: 'Performance Optimizations',
      description: 'Faster loading and better responsiveness',
      risk: 'low',
      stable: true
    },
    {
      key: 'visualImprovements',
      name: 'Visual Improvements',
      description: 'Enhanced UI animations and feedback',
      risk: 'medium',
      stable: true
    },
    {
      key: 'enhancedDashboard',
      name: 'Enhanced Dashboard',
      description: 'Improved dashboard with better metrics display',
      risk: 'medium',
      stable: false
    },
    {
      key: 'advancedAnalytics',
      name: 'Advanced Analytics',
      description: 'Additional analytical tools and insights',
      risk: 'high',
      stable: false
    }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Reggio Platform Features</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Migration Status */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">Migration Status</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Enrolled Features:</span>
              <span className="ml-1 font-medium">{status.enrolledFeatures.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Last Update:</span>
              <span className="ml-1 font-medium">{status.lastUpdate.toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-gray-600">Rollback Count:</span>
              <span className="ml-1 font-medium">{status.rollbackCount}</span>
            </div>
            <div>
              <span className="text-gray-600">Feedback:</span>
              <span className="ml-1 font-medium">
                {status.feedbackSubmitted ? 'Submitted' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-4">
          {features.map(feature => {
            const isEnabled = migration.isFeatureEnabled(feature.key);
            const isEnrolled = status.enrolledFeatures.includes(feature.key);
            
            return (
              <div
                key={feature.key}
                className={`p-4 border rounded-lg transition-all duration-200 ${
                  isEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium">{feature.name}</h3>
                      <Badge className={getRiskColor(feature.risk)}>
                        {feature.risk} risk
                      </Badge>
                      {feature.stable && (
                        <Badge variant="outline">Stable</Badge>
                      )}
                      {isEnrolled && (
                        <Badge variant="secondary">Enrolled</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {feature.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          migration.enableFeature(feature.key);
                        } else {
                          migration.disableFeature(feature.key);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-medium mb-4 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
              Advanced Options
            </h3>
            
            <div className="space-y-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('This will reset all features to default. Continue?')) {
                    migration.resetAllFeatures();
                  }
                }}
              >
                Emergency Rollback
              </Button>
              
              <div className="text-xs text-gray-500">
                Use emergency rollback if you experience issues. This will disable all
                experimental features and reload the page.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Wrapper component for conditional feature rendering
interface FeatureWrapperProps {
  feature: keyof FeatureFlags;
  fallback?: React.ComponentType<any>;
  children: React.ReactNode;
  [key: string]: any;
}

export function FeatureWrapper({ 
  feature, 
  fallback: Fallback, 
  children, 
  ...props 
}: FeatureWrapperProps) {
  const migration = useMigration();
  
  // Show enhanced version if feature is enabled
  if (migration.isFeatureEnabled(feature)) {
    return <>{children}</>;
  }
  
  // Show fallback component if provided
  if (Fallback) {
    return <Fallback {...props} />;
  }
  
  // Don't render anything if feature is disabled and no fallback
  return null;
}

// HOC for gradual component migration
export function withFeatureFlag<P extends object>(
  feature: keyof FeatureFlags,
  EnhancedComponent: React.ComponentType<P>,
  OriginalComponent?: React.ComponentType<P>
) {
  return function FeatureFlaggedComponent(props: P) {
    const migration = useMigration();
    
    if (migration.isFeatureEnabled(feature)) {
      return <EnhancedComponent {...props} />;
    }
    
    if (OriginalComponent) {
      return <OriginalComponent {...props} />;
    }
    
    // If no original component provided, render enhanced with feature disabled
    return <EnhancedComponent {...props} />;
  };
}

// Migration notification banner
export function MigrationNotificationBanner() {
  const migration = useMigration();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('reggio-migration-banner-dismissed') === 'true';
  });
  
  const status = migration.getMigrationStatus();
  const hasNewFeatures = status.enrolledFeatures.length === 0;
  
  if (dismissed || !hasNewFeatures) return null;
  
  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('reggio-migration-banner-dismissed', 'true');
  };
  
  const handleEnableRecommended = () => {
    // Enable safe features by default
    migration.enableFeature('betterErrorHandling');
    migration.enableFeature('improvedMonitoring');
    migration.enableFeature('performanceOptimizations');
    handleDismiss();
  };
  
  return (
    <div className="bg-blue-600 text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="h-5 w-5" />
          <div>
            <p className="font-medium">New Reggio Features Available!</p>
            <p className="text-sm text-blue-100">
              We've added improvements to enhance your experience.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnableRecommended}
            className="text-blue-600 border-white hover:bg-white/10"
          >
            Enable Recommended
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-white hover:bg-white/10"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}

// Example usage components for the existing Dashboard
export function SafeDashboardMigration() {
  // This would wrap the existing Dashboard component
  return (
    <FeatureWrapper
      feature="enhancedDashboard"
      fallback={() => <div>Original Dashboard Component</div>}
    >
      <div>Enhanced Dashboard Component</div>
    </FeatureWrapper>
  );
}

// Migration progress indicator
export function MigrationProgress() {
  const migration = useMigration();
  const status = migration.getMigrationStatus();
  
  const totalFeatures = 6; // Based on available features
  const enabledFeatures = status.enrolledFeatures.length;
  const progress = (enabledFeatures / totalFeatures) * 100;
  
  return (
    <div className="w-full max-w-md">
      <div className="flex justify-between text-sm mb-2">
        <span>Migration Progress</span>
        <span>{enabledFeatures}/{totalFeatures} features</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Integration with existing App.tsx
export function MigratedAppWrapper({ children }: { children: React.ReactNode }) {
  const migration = useMigration();
  
  // Add migration-specific error boundary
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Migration error caught:', error);
      setHasError(true);
      
      // If we have repeated errors, auto-rollback
      const errorCount = parseInt(localStorage.getItem('reggio-error-count') || '0');
      localStorage.setItem('reggio-error-count', String(errorCount + 1));
      
      if (errorCount > 3) {
        console.warn('Multiple errors detected, performing emergency rollback');
        migration.resetAllFeatures();
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [migration]);
  
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              System Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              We encountered an issue with the enhanced features. 
              We're rolling back to ensure stability.
            </p>
            <Button
              onClick={() => {
                migration.resetAllFeatures();
                window.location.reload();
              }}
              className="w-full"
            >
              Restore Default Experience
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <>
      {migration.isFeatureEnabled('improvedMonitoring') && (
        <MigrationNotificationBanner />
      )}
      {children}
    </>
  );
}

// Export the migration manager instance
export const reggioMigration = ReggioMigrationManager.getInstance();

// Type-safe feature checking function
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return reggioMigration.isFeatureEnabled(feature);
}

// Example integration with existing components
export const MIGRATION_EXAMPLES = {
  // How to wrap the existing Dashboard
  Dashboard: withFeatureFlag(
    'enhancedDashboard',
    () => <div>Enhanced Dashboard</div>,
    () => <div>Original Dashboard</div>
  ),
  
  // How to conditionally render new features
  NewAnalyticsPanel: () => (
    <FeatureWrapper feature="advancedAnalytics">
      <div>Advanced Analytics Panel</div>
    </FeatureWrapper>
  ),
  
  // How to add monitoring to existing hooks
  useMonitoredFinancialData: () => {
    const migration = useMigration();
    
    if (migration.isFeatureEnabled('improvedMonitoring')) {
      // Return enhanced version with monitoring
      return { /* enhanced data with monitoring */ };
    }
    
    // Return original functionality
    return { /* original useFinancialData result */ };
  }
};

/*
IMPLEMENTATION PLAN:

1. Add MigratedAppWrapper to App.tsx:
   ```tsx
   function App() {
     return (
       <QueryClientProvider client={queryClient}>
         <MigratedAppWrapper>
           {/* existing app content */}
         </MigratedAppWrapper>
       </QueryClientProvider>
     );
   }
   ```

2. Wrap existing components gradually:
   ```tsx
   // Instead of: <Dashboard />
   // Use: <FeatureWrapper feature="enhancedDashboard" fallback={Dashboard}>
   //        <EnhancedDashboard />
   //      </FeatureWrapper>
   ```

3. Add feature manager to admin/debug page:
   ```tsx
   // In Debug.tsx or a new admin page
   <FeatureManagerPanel />
   ```

4. Monitor and iterate:
   - Start with low-risk features enabled by default
   - Gradually enable more features based on user feedback
   - Use rollback capabilities if issues arise
*/
