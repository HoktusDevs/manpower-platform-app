// Migration Service - Gradual migration and A/B testing
// Controls which system to use for each feature based on configuration

interface MigrationConfig {
  // Feature flags for gradual migration
  features: {
    authentication: 'legacy' | 'cognito' | 'ab_test';
    applications: 'legacy' | 'aws_native' | 'ab_test';
    documents: 'legacy' | 'aws_native' | 'ab_test';
    realtime: 'legacy' | 'aws_native' | 'ab_test';
    analytics: 'legacy' | 'aws_native' | 'ab_test';
  };
  
  // A/B testing configuration
  abTesting: {
    enabled: boolean;
    splitPercentage: number; // 0-100, percentage of users on new system
    userIdBasedSplit: boolean; // Consistent split based on user ID
    adminOverride?: 'legacy' | 'aws_native'; // Force admin to specific system
  };
  
  // Performance monitoring
  performance: {
    trackLatency: boolean;
    trackErrors: boolean;
    trackSuccess: boolean;
    sampleRate: number; // 0-1, percentage of requests to monitor
  };
  
  // Rollback configuration
  rollback: {
    enabled: boolean;
    errorThreshold: number; // Error rate threshold to trigger rollback
    latencyThreshold: number; // Latency threshold (ms) to trigger rollback  
    monitoringWindow: number; // Minutes to monitor before rollback
  };
}

interface PerformanceMetrics {
  system: 'legacy' | 'aws_native';
  feature: keyof MigrationConfig['features'];
  operation: string;
  latency: number;
  success: boolean;
  error?: string;
  timestamp: number;
  userId?: string;
}

class MigrationService {
  private config: MigrationConfig;
  private metrics: PerformanceMetrics[] = [];
  private userSystemAssignments: Map<string, 'legacy' | 'aws_native'> = new Map();

  constructor() {
    // Default configuration - can be overridden via environment or API
    this.config = {
      features: {
        authentication: import.meta.env.VITE_USE_COGNITO === 'true' ? 'cognito' : 'legacy',
        applications: import.meta.env.VITE_USE_AWS_NATIVE === 'true' ? 'aws_native' : 'ab_test',
        documents: 'aws_native', // Migrated to S3 direct upload
        realtime: 'aws_native', // Always use new system for real-time  
        analytics: 'aws_native' // Migrated to Kinesis/CloudWatch
      },
      abTesting: {
        enabled: true,
        splitPercentage: 50, // 50% of users on new system
        userIdBasedSplit: true,
        adminOverride: 'aws_native' // Admins always use new system
      },
      performance: {
        trackLatency: true,
        trackErrors: true, 
        trackSuccess: true,
        sampleRate: 1.0 // Track 100% of requests in dev
      },
      rollback: {
        enabled: true,
        errorThreshold: 0.05, // 5% error rate triggers rollback
        latencyThreshold: 2000, // 2s latency triggers rollback
        monitoringWindow: 10 // Monitor for 10 minutes
      }
    };

    this.loadConfigFromStorage();
    this.startPerformanceMonitoring();
  }

  /**
   * Determine which system to use for a specific feature
   */
  getSystemForFeature(feature: keyof MigrationConfig['features'], userId?: string): 'legacy' | 'aws_native' | 'cognito' {
    const featureConfig = this.config.features[feature];
    
    // If feature is not in A/B test, return configured system
    if (featureConfig !== 'ab_test') {
      return featureConfig;
    }

    // Admin override
    if (userId && this.isAdmin(userId) && this.config.abTesting.adminOverride) {
      return this.config.abTesting.adminOverride;
    }

    // A/B Testing logic
    if (this.config.abTesting.enabled) {
      return this.getABTestSystem(feature, userId);
    }

    // Default to legacy if A/B testing is disabled
    return 'legacy';
  }

  /**
   * A/B Testing system assignment
   */
  private getABTestSystem(_feature: keyof MigrationConfig['features'], userId?: string): 'legacy' | 'aws_native' {
    if (!userId) {
      // Anonymous users get random assignment
      return Math.random() < (this.config.abTesting.splitPercentage / 100) ? 'aws_native' : 'legacy';
    }

    // Consistent user-based split
    if (this.config.abTesting.userIdBasedSplit) {
      const cachedAssignment = this.userSystemAssignments.get(userId);
      if (cachedAssignment) {
        return cachedAssignment;
      }

      // Hash user ID to get consistent assignment
      const hash = this.hashString(userId);
      const assignment = (hash % 100) < this.config.abTesting.splitPercentage ? 'aws_native' : 'legacy';
      
      this.userSystemAssignments.set(userId, assignment);
      return assignment;
    }

    // Random assignment
    return Math.random() < (this.config.abTesting.splitPercentage / 100) ? 'aws_native' : 'legacy';
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: Omit<PerformanceMetrics, 'timestamp'>): void {
    if (!this.config.performance.trackLatency && !this.config.performance.trackErrors) {
      return;
    }

    // Sample requests based on sample rate
    if (Math.random() > this.config.performance.sampleRate) {
      return;
    }

    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Store in localStorage for persistence
    this.saveMetricsToStorage();

    // Check for rollback conditions
    this.checkRollbackConditions();

    // Log metrics for debugging
    }

  /**
   * Get performance comparison between systems
   */
  getPerformanceComparison(feature?: keyof MigrationConfig['features'], timeWindowMinutes = 60): {
    legacy: {
      averageLatency: number;
      errorRate: number;
      totalRequests: number;
      successRate: number;
    };
    aws_native: {
      averageLatency: number;
      errorRate: number;
      totalRequests: number;
      successRate: number;
    };
    improvement: {
      latencyImprovement: number; // Percentage improvement
      errorRateImprovement: number; // Percentage improvement
      reliabilityImprovement: number; // Percentage improvement
    };
  } {
    const cutoffTime = Date.now() - (timeWindowMinutes * 60 * 1000);
    const relevantMetrics = this.metrics.filter(m => 
      m.timestamp > cutoffTime && 
      (!feature || m.feature === feature)
    );

    const legacyMetrics = relevantMetrics.filter(m => m.system === 'legacy');
    const awsNativeMetrics = relevantMetrics.filter(m => m.system === 'aws_native');

    const calculateStats = (metrics: PerformanceMetrics[]) => {
      if (metrics.length === 0) {
        return { averageLatency: 0, errorRate: 0, totalRequests: 0, successRate: 0 };
      }

      const totalRequests = metrics.length;
      const successfulRequests = metrics.filter(m => m.success).length;
      const averageLatency = metrics.reduce((sum, m) => sum + m.latency, 0) / totalRequests;
      const errorRate = (totalRequests - successfulRequests) / totalRequests;
      const successRate = successfulRequests / totalRequests;

      return { averageLatency, errorRate, totalRequests, successRate };
    };

    const legacyStats = calculateStats(legacyMetrics);
    const awsNativeStats = calculateStats(awsNativeMetrics);

    // Calculate improvements (positive = better)
    const latencyImprovement = legacyStats.averageLatency > 0 
      ? ((legacyStats.averageLatency - awsNativeStats.averageLatency) / legacyStats.averageLatency) * 100 
      : 0;
    
    const errorRateImprovement = legacyStats.errorRate > 0
      ? ((legacyStats.errorRate - awsNativeStats.errorRate) / legacyStats.errorRate) * 100
      : 0;
      
    const reliabilityImprovement = legacyStats.successRate > 0
      ? ((awsNativeStats.successRate - legacyStats.successRate) / legacyStats.successRate) * 100
      : 0;

    return {
      legacy: legacyStats,
      aws_native: awsNativeStats,
      improvement: {
        latencyImprovement,
        errorRateImprovement,
        reliabilityImprovement
      }
    };
  }

  /**
   * Update migration configuration
   */
  updateConfig(newConfig: Partial<MigrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfigToStorage();
    
    }

  /**
   * Force a feature to use a specific system (admin override)
   */
  forceFeatureSystem(feature: keyof MigrationConfig['features'], system: 'legacy' | 'aws_native' | 'ab_test' | 'cognito'): void {
    if (feature === 'authentication') {
      if (system === 'cognito' || system === 'legacy' || system === 'ab_test') {
        this.config.features[feature] = system;
      }
    } else if (feature === 'applications' || feature === 'documents' || feature === 'realtime' || feature === 'analytics') {
      if (system === 'legacy' || system === 'aws_native' || system === 'ab_test') {
        this.config.features[feature] = system;
      }
    }
    this.saveConfigToStorage();
    
    }

  /**
   * Get current configuration
   */
  getConfig(): MigrationConfig {
    return { ...this.config };
  }

  /**
   * Check for automatic rollback conditions
   */
  private checkRollbackConditions(): void {
    if (!this.config.rollback.enabled) {
      return;
    }

    const comparison = this.getPerformanceComparison(undefined, this.config.rollback.monitoringWindow);
    
    // Check error rate threshold
    if (comparison.aws_native.errorRate > this.config.rollback.errorThreshold) {
      this.triggerRollback();
    }

    // Check latency threshold
    if (comparison.aws_native.averageLatency > this.config.rollback.latencyThreshold) {
      this.triggerRollback();
    }
  }

  /**
   * Trigger automatic rollback
   */
  private triggerRollback(): void {
    // Set all features to legacy system
    Object.keys(this.config.features).forEach(feature => {
      const featureKey = feature as keyof MigrationConfig['features'];
      if (featureKey === 'authentication') {
        this.config.features[featureKey] = 'legacy';
      } else {
        this.config.features[featureKey] = 'legacy';
      }
    });
    
    this.saveConfigToStorage();
    
    // Notify monitoring systems (in production)
    this.notifyRollback();
  }

  /**
   * Utility functions
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private isAdmin(userId: string): boolean {
    // In production, check user role from auth service
    // For now, check if user ID contains 'admin'
    return userId.toLowerCase().includes('admin');
  }

  private loadConfigFromStorage(): void {
    try {
      const stored = localStorage.getItem('migration_config');
      if (stored) {
        const storedConfig = JSON.parse(stored);
        this.config = { ...this.config, ...storedConfig };
      }
    } catch {
      // Configuración no válida, usar valores por defecto
    }
  }

  private saveConfigToStorage(): void {
    try {
      localStorage.setItem('migration_config', JSON.stringify(this.config));
    } catch {
      // Error al guardar configuración, continuar sin persistencia
    }
  }

  private saveMetricsToStorage(): void {
    try {
      // Keep only last 100 metrics in localStorage to avoid storage limits
      const metricsToStore = this.metrics.slice(-100);
      localStorage.setItem('performance_metrics', JSON.stringify(metricsToStore));
    } catch {
      // Error al guardar métricas, continuar sin persistencia
    }
  }

  private startPerformanceMonitoring(): void {
    // Load existing metrics from storage
    try {
      const stored = localStorage.getItem('performance_metrics');
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch {
      // Métricas no válidas, empezar con array vacío
    }

    // Periodic cleanup of old metrics
    setInterval(() => {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    }, 60 * 60 * 1000); // Clean every hour
  }

  private notifyRollback(): void {
    // In production, send alerts to monitoring systems
    // Example: Send to monitoring service
    // fetch('/api/monitoring/rollback', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ timestamp: Date.now() })
    // });
  }
}

// Export singleton instance
export const migrationService = new MigrationService();
export type { MigrationConfig, PerformanceMetrics };