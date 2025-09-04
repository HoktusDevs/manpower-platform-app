// Analytics Hook - Easy analytics integration with migration awareness
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService, type UserAction } from '../services/analyticsService';
import { authService } from '../services/authService';

export const useAnalytics = () => {
  const location = useLocation();

  // Auto-track page views
  useEffect(() => {
    analyticsService.trackPageView({
      page: location.pathname,
      title: document.title,
      url: window.location.href
    });
  }, [location.pathname]);

  // Track user action
  const trackAction = (action: Omit<UserAction, 'timestamp' | 'userId'>) => {
    analyticsService.trackUserAction(action);
  };

  // Track custom event
  const trackEvent = (eventName: string, properties: Record<string, any> = {}) => {
    const user = authService.getCurrentUser();
    analyticsService.trackEvent({
      eventName,
      userId: user?.userId,
      sessionId: `session_${Date.now()}`,
      timestamp: Date.now(),
      properties
    });
  };

  // Track button clicks
  const trackButtonClick = (buttonName: string, context?: Record<string, any>) => {
    trackAction({
      action: 'click',
      target: buttonName,
      context
    });
  };

  // Track form submissions
  const trackFormSubmit = (formName: string, context?: Record<string, any>) => {
    trackAction({
      action: 'form_submit',
      target: formName,
      context
    });
  };

  // Track application events
  const trackApplicationEvent = (event: 'create' | 'update' | 'view', applicationId?: string) => {
    trackEvent('application_event', {
      event,
      applicationId,
      timestamp: Date.now()
    });
  };

  // Track migration events
  const trackMigrationEvent = (feature: string, system: 'legacy' | 'aws_native') => {
    trackEvent('migration_event', {
      feature,
      system,
      timestamp: Date.now()
    });
  };

  return {
    trackAction,
    trackEvent,
    trackButtonClick,
    trackFormSubmit,
    trackApplicationEvent,
    trackMigrationEvent,
    setConsent: analyticsService.setAnalyticsConsent.bind(analyticsService),
    getConsent: analyticsService.getAnalyticsConsent.bind(analyticsService)
  };
};