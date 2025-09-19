// Analytics Types - Precise typing for analytics events and properties

export interface AnalyticsProperties {
  // Page view properties
  page?: string;
  title?: string;
  url?: string;
  
  // User action properties
  action?: string;
  target?: string;
  context?: AnalyticsContext;
  
  // Application event properties
  event?: 'create' | 'update' | 'view';
  applicationId?: string;
  
  // Migration event properties
  feature?: string;
  system?: 'legacy' | 'aws_native';
  
  // Common properties
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

export interface AnalyticsContext {
  // Button context
  buttonId?: string;
  buttonText?: string;
  section?: string;
  
  // Form context
  formId?: string;
  formName?: string;
  fieldCount?: number;
  
  // Application context
  applicationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW' | 'INTERVIEW_SCHEDULED' | 'HIRED';
  companyName?: string;
  
  // Navigation context
  previousPage?: string;
  referrer?: string;
  
  // Error context
  errorType?: string;
  errorMessage?: string;
}

export interface EventMetadata {
  userAgent: string;
  url: string;
  referrer: string;
  screen: {
    width: number;
    height: number;
  };
}