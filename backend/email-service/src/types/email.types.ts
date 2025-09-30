export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  contentType: string;
}

export interface SendEmailRequest {
  to: EmailRecipient | EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  attachments?: EmailAttachment[];
  replyTo?: string;
  metadata?: Record<string, string>;
}

export interface SendBulkEmailRequest {
  recipients: EmailRecipient[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  attachments?: EmailAttachment[];
}

export interface EmailRecord {
  emailId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  status: EmailStatus;
  templateId?: string;
  sentAt?: number;
  deliveredAt?: number;
  failedAt?: number;
  errorMessage?: string;
  metadata?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
  ttl?: number;
}

export enum EmailStatus {
  PENDING = 'PENDING',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  COMPLAINED = 'COMPLAINED',
}

export interface EmailHistoryQuery {
  recipientEmail?: string;
  status?: EmailStatus;
  startDate?: number;
  endDate?: number;
  limit?: number;
  lastEvaluatedKey?: Record<string, unknown>;
}

export interface EmailHistoryResponse {
  emails: EmailRecord[];
  lastEvaluatedKey?: Record<string, unknown>;
  count: number;
}

export interface SendEmailResponse {
  success: boolean;
  emailId: string;
  messageId?: string;
  message: string;
}

export interface SendBulkEmailResponse {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: {
    emailId: string;
    recipientEmail: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}