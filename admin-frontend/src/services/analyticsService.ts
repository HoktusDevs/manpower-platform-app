// Analytics Service - Migration-aware analytics tracking
// Handles both Legacy analytics API and AWS-Native (Kinesis/CloudWatch)

import { cognitoAuthService } from '../services/cognitoAuthService';
import { migrationService } from './migrationService';
import type { AnalyticsProperties, AnalyticsContext, EventMetadata } from '../types/analytics';

interface AnalyticsEvent {
  eventName: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  properties: AnalyticsProperties;
  metadata?: EventMetadata;
}

interface PageView {
  page: string;
  title?: string;
  url: string;
  userId?: string;
  timestamp: number;
}

interface UserAction {
  action: string;
  target: string;
  userId?: string;
  timestamp: number;
  context?: AnalyticsProperties;
}

class AnalyticsService {
  private sessionId: string;
  private queue: AnalyticsEvent[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupEventListeners();
    this.startPeriodicFlush();
  }

  /**
   * Track page view with migration-aware system
   */
  async trackPageView(pageView: Omit<PageView, 'timestamp'>): Promise<void> {
    const user = cognitoAuthService.getCurrentUser();
    const event: AnalyticsEvent = {
      eventName: 'page_view',
      userId: user?.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      properties: {
        page: pageView.page,
        title: pageView.title || document.title,
        url: pageView.url || window.location.href
      },
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      }
    };

    await this.trackEvent(event);
  }

  /**
   * Track user action with migration-aware system
   */
  async trackUserAction(userAction: Omit<UserAction, 'timestamp' | 'userId'>): Promise<void> {
    const user = cognitoAuthService.getCurrentUser();
    const event: AnalyticsEvent = {
      eventName: 'user_action',
      userId: user?.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      properties: {
        page: window.location.pathname,
        title: document.title,
        url: window.location.href,
        action: userAction.action,
        target: userAction.target,
        context: userAction.context as AnalyticsContext
      }
    };

    await this.trackEvent(event);
  }

  /**
   * Track custom event with migration-aware system
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.shouldTrack()) {
      return;
    }

    const user = cognitoAuthService.getCurrentUser();
    const systemUsed = migrationService.getSystemForFeature('analytics', user?.userId);
    const startTime = Date.now();

    try {
      // Add to queue first for reliability
      this.queue.push(event);

      if (systemUsed === 'aws_native') {
        await this.sendToAWSNative([event]);
        } else {
        await this.sendToLegacyAPI([event]);
        }

      // Remove from queue after successful send
      this.queue = this.queue.filter(e => e !== event);

      // Track performance metrics
      if (user) {
        migrationService.trackPerformance({
          system: systemUsed === 'aws_native' ? 'aws_native' : 'legacy',
          feature: 'analytics',
          operation: 'trackEvent',
          latency: Date.now() - startTime,
          success: true,
          userId: user.userId
        });
      }
    } catch (error) {
      // Track error metrics
      if (user) {
        migrationService.trackPerformance({
          system: systemUsed === 'aws_native' ? 'aws_native' : 'legacy',
          feature: 'analytics',
          operation: 'trackEvent',
          latency: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : 'Analytics failed',
          userId: user.userId
        });
      }

      // Event remains in queue for retry
    }
  }

  /**
   * AWS-Native: Send events to Kinesis/CloudWatch
   */
  private async sendToAWSNative(events: AnalyticsEvent[]): Promise<void> {
    // Simulate AWS Kinesis/CloudWatch ingestion
    console.debug('Sending events to AWS Native:', events.length);
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    // In production, this would send to:
    // - Kinesis Data Firehose for real-time analytics
    // - CloudWatch for monitoring and dashboards
    // - S3 for long-term storage and analysis
    
    }

  /**
   * Legacy: Send events to legacy analytics API
   */
  private async sendToLegacyAPI(events: AnalyticsEvent[]): Promise<void> {
    // Simulate legacy analytics API call
    console.debug('Sending events to Legacy API:', events.length);
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // const token = cognitoAuthService.getToken();
    // const payload = {
    //   events: events.map(event => ({
    //     ...event,
    //     source: 'manpower-frontend',
    //     version: '1.0.0'
    //   }))
    // };

    // In production, this would POST to legacy analytics endpoint
    }

  /**
   * Flush queued events periodically
   */
  private startPeriodicFlush(): void {
    setInterval(() => {
      if (this.queue.length > 0 && this.isOnline) {
        this.flushQueue();
      }
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Flush all queued events
   */
  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const user = cognitoAuthService.getCurrentUser();
    const systemUsed = migrationService.getSystemForFeature('analytics', user?.userId);
    const eventsToFlush = [...this.queue];

    try {
      if (systemUsed === 'aws_native') {
        await this.sendToAWSNative(eventsToFlush);
      } else {
        await this.sendToLegacyAPI(eventsToFlush);
      }

      // Clear queue on success
      this.queue = [];
      } catch {
      // Keep events in queue for next retry
      console.warn('Failed to flush analytics events, keeping in queue for retry');
    }
  }

  /**
   * Setup event listeners for automatic tracking
   */
  private setupEventListeners(): void {
    // Track online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue(); // Flush when coming back online
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushQueue(); // Flush before page becomes hidden
      }
    });

    // Track before page unload
    window.addEventListener('beforeunload', () => {
      this.flushQueue();
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if tracking is enabled
   */
  private shouldTrack(): boolean {
    // Check if analytics is enabled in environment
    const analyticsEnabled = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
    
    // Check if user has consented to analytics (GDPR compliance)
    const hasConsent = localStorage.getItem('analytics_consent') === 'true';
    
    return analyticsEnabled && hasConsent && this.isOnline;
  }

  /**
   * Set user consent for analytics
   */
  setAnalyticsConsent(consent: boolean): void {
    localStorage.setItem('analytics_consent', consent.toString());
    
    if (consent) {
      // Consent granted - analytics can proceed normally
      console.log('Analytics consent granted');
    } else {
      this.queue = []; // Clear queue if consent is revoked
    }
  }

  /**
   * Get analytics consent status
   */
  getAnalyticsConsent(): boolean {
    return localStorage.getItem('analytics_consent') === 'true';
  }
}

// Export singleton
export const analyticsService = new AnalyticsService();
export type { AnalyticsEvent, PageView, UserAction };