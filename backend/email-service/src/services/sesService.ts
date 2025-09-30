import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { SendEmailRequest, EmailAttachment } from '../types/email.types';

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

export class SESService {
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@manpower.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Manpower Platform';
  }

  async sendEmail(request: SendEmailRequest): Promise<string> {
    const recipients = Array.isArray(request.to) ? request.to : [request.to];

    // If has attachments, use SendRawEmail
    if (request.attachments && request.attachments.length > 0) {
      return await this.sendRawEmail(request);
    }

    // Use simple SendEmail for basic emails
    const command = new SendEmailCommand({
      Source: `${this.fromName} <${this.fromEmail}>`,
      Destination: {
        ToAddresses: recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email),
        CcAddresses: request.cc?.map(r => r.name ? `${r.name} <${r.email}>` : r.email),
        BccAddresses: request.bcc?.map(r => r.name ? `${r.name} <${r.email}>` : r.email),
      },
      Message: {
        Subject: {
          Data: request.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: request.htmlBody ? {
            Data: request.htmlBody,
            Charset: 'UTF-8',
          } : undefined,
          Text: request.textBody ? {
            Data: request.textBody,
            Charset: 'UTF-8',
          } : undefined,
        },
      },
      ReplyToAddresses: request.replyTo ? [request.replyTo] : undefined,
    });

    const response = await sesClient.send(command);
    return response.MessageId || '';
  }

  private async sendRawEmail(request: SendEmailRequest): Promise<string> {
    const recipients = Array.isArray(request.to) ? request.to : [request.to];
    const rawMessage = this.buildRawEmailMessage(request, recipients);

    const command = new SendRawEmailCommand({
      Source: `${this.fromName} <${this.fromEmail}>`,
      Destinations: recipients.map(r => r.email),
      RawMessage: {
        Data: Buffer.from(rawMessage),
      },
    });

    const response = await sesClient.send(command);
    return response.MessageId || '';
  }

  private buildRawEmailMessage(request: SendEmailRequest, recipients: Array<{ email: string; name?: string }>): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const attachmentBoundary = `----=_Attachment_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    let message = '';

    // Headers
    message += `From: ${this.fromName} <${this.fromEmail}>\r\n`;
    message += `To: ${recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', ')}\r\n`;
    if (request.cc && request.cc.length > 0) {
      message += `Cc: ${request.cc.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', ')}\r\n`;
    }
    message += `Subject: ${request.subject}\r\n`;
    message += `MIME-Version: 1.0\r\n`;
    message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

    // Body
    message += `--${boundary}\r\n`;
    message += `Content-Type: multipart/alternative; boundary="${attachmentBoundary}"\r\n\r\n`;

    // Text body
    if (request.textBody) {
      message += `--${attachmentBoundary}\r\n`;
      message += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      message += `${request.textBody}\r\n\r\n`;
    }

    // HTML body
    if (request.htmlBody) {
      message += `--${attachmentBoundary}\r\n`;
      message += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
      message += `${request.htmlBody}\r\n\r\n`;
    }

    message += `--${attachmentBoundary}--\r\n`;

    // Attachments
    if (request.attachments) {
      for (const attachment of request.attachments) {
        message += `--${boundary}\r\n`;
        message += `Content-Type: ${attachment.contentType}\r\n`;
        message += `Content-Transfer-Encoding: base64\r\n`;
        message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n\r\n`;
        message += `${attachment.content}\r\n\r\n`;
      }
    }

    message += `--${boundary}--\r\n`;

    return message;
  }

  async verifyEmailAddress(email: string): Promise<boolean> {
    // Note: In production, you should verify email addresses through SES console
    // or use the VerifyEmailIdentity API
    // This is a placeholder for the verification logic
    return true;
  }
}