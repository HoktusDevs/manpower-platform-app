import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SESService } from '../services/sesService';
import { EmailRepository } from '../services/emailRepository';
import { EmailTemplates } from '../templates/emailTemplates';
import {
  SendEmailRequest,
  SendBulkEmailRequest,
  SendEmailResponse,
  SendBulkEmailResponse,
  EmailStatus,
  EmailHistoryQuery,
} from '../types/email.types';

const sesService = new SESService();
const emailRepository = new EmailRepository();

export const sendEmail = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Request body is required',
        }),
      };
    }

    const request: SendEmailRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.to || !request.subject) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Missing required fields: to, subject',
        }),
      };
    }

    // If templateId is provided, use template
    if (request.templateId && request.templateData) {
      const template = EmailTemplates.getTemplate(request.templateId, request.templateData as Record<string, string | number | boolean>);
      if (template) {
        request.htmlBody = template.htmlBody;
        request.textBody = template.textBody;
        request.subject = template.subject;
      }
    }

    // Validate that at least one body type is provided
    if (!request.htmlBody && !request.textBody) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Either htmlBody, textBody, or templateId must be provided',
        }),
      };
    }

    const recipients = Array.isArray(request.to) ? request.to : [request.to];
    const firstRecipient = recipients[0];
    const recipientEmail = typeof firstRecipient === 'string' ? firstRecipient : firstRecipient.email;
    const recipientName = typeof firstRecipient === 'string' ? undefined : firstRecipient.name;

    // Create email record
    const emailRecord = await emailRepository.createEmailRecord({
      recipientEmail,
      recipientName,
      subject: request.subject,
      status: EmailStatus.PENDING,
      templateId: request.templateId,
      metadata: request.metadata,
    });

    try {
      // Send email via SES
      const messageId = await sesService.sendEmail(request);

      // Update email record as sent
      await emailRepository.updateEmailStatus(emailRecord.emailId, EmailStatus.SENT, {
        messageId,
        sentAt: Date.now(),
      });

      const response: SendEmailResponse = {
        success: true,
        emailId: emailRecord.emailId,
        messageId,
        message: 'Email sent successfully',
      };

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(response),
      };
    } catch (error) {
      // Update email record as failed
      await emailRepository.updateEmailStatus(emailRecord.emailId, EmailStatus.FAILED, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        failedAt: Date.now(),
      });

      throw error;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send email',
      }),
    };
  }
};

export const sendBulkEmail = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Request body is required',
        }),
      };
    }

    const request: SendBulkEmailRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.recipients || request.recipients.length === 0 || !request.subject) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Missing required fields: recipients, subject',
        }),
      };
    }

    // If templateId is provided, use template
    let htmlBody = request.htmlBody;
    let textBody = request.textBody;
    let subject = request.subject;

    if (request.templateId && request.templateData) {
      const template = EmailTemplates.getTemplate(request.templateId, request.templateData as Record<string, string | number | boolean>);
      if (template) {
        htmlBody = template.htmlBody;
        textBody = template.textBody;
        subject = template.subject;
      }
    }

    const results: SendBulkEmailResponse['results'] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Send emails sequentially to avoid rate limits
    for (const recipient of request.recipients) {
      try {
        // Create email record
        const emailRecord = await emailRepository.createEmailRecord({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject,
          status: EmailStatus.PENDING,
          templateId: request.templateId,
        });

        try {
          // Send email
          const messageId = await sesService.sendEmail({
            to: recipient,
            subject,
            htmlBody,
            textBody,
            attachments: request.attachments,
          });

          // Update as sent
          await emailRepository.updateEmailStatus(emailRecord.emailId, EmailStatus.SENT, {
            messageId,
            sentAt: Date.now(),
          });

          results.push({
            emailId: emailRecord.emailId,
            recipientEmail: recipient.email,
            success: true,
            messageId,
          });

          totalSent++;
        } catch (error) {
          // Update as failed
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await emailRepository.updateEmailStatus(emailRecord.emailId, EmailStatus.FAILED, {
            errorMessage,
            failedAt: Date.now(),
          });

          results.push({
            emailId: emailRecord.emailId,
            recipientEmail: recipient.email,
            success: false,
            error: errorMessage,
          });

          totalFailed++;
        }
      } catch (error) {
        results.push({
          emailId: '',
          recipientEmail: recipient.email,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create email record',
        });

        totalFailed++;
      }
    }

    const response: SendBulkEmailResponse = {
      success: totalSent > 0,
      totalSent,
      totalFailed,
      results,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error sending bulk email:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send bulk email',
      }),
    };
  }
};

export const getEmailStatus = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const emailId = event.pathParameters?.emailId;

    if (!emailId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'emailId is required',
        }),
      };
    }

    const emailRecord = await emailRepository.getEmailRecord(emailId);

    if (!emailRecord) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Email not found',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        email: emailRecord,
      }),
    };
  } catch (error) {
    console.error('Error getting email status:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get email status',
      }),
    };
  }
};

export const getEmailHistory = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const query: EmailHistoryQuery = {
      recipientEmail: event.queryStringParameters?.recipientEmail,
      status: event.queryStringParameters?.status as EmailStatus | undefined,
      startDate: event.queryStringParameters?.startDate
        ? parseInt(event.queryStringParameters.startDate)
        : undefined,
      endDate: event.queryStringParameters?.endDate
        ? parseInt(event.queryStringParameters.endDate)
        : undefined,
      limit: event.queryStringParameters?.limit
        ? parseInt(event.queryStringParameters.limit)
        : 50,
    };

    const history = await emailRepository.getEmailHistory(query);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        ...history,
      }),
    };
  } catch (error) {
    console.error('Error getting email history:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get email history',
      }),
    };
  }
};

export const resendEmail = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const emailId = event.pathParameters?.emailId;

    if (!emailId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'emailId is required',
        }),
      };
    }

    const originalEmail = await emailRepository.getEmailRecord(emailId);

    if (!originalEmail) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Email not found',
        }),
      };
    }

    // Create new email record for resend
    const newEmailRecord = await emailRepository.createEmailRecord({
      recipientEmail: originalEmail.recipientEmail,
      recipientName: originalEmail.recipientName,
      subject: originalEmail.subject,
      status: EmailStatus.PENDING,
      templateId: originalEmail.templateId,
      metadata: { ...originalEmail.metadata, originalEmailId: emailId },
    });

    try {
      // Reconstruct email request (simplified - in production you'd want to store more details)
      const emailRequest: SendEmailRequest = {
        to: {
          email: originalEmail.recipientEmail,
          name: originalEmail.recipientName,
        },
        subject: originalEmail.subject,
        templateId: originalEmail.templateId,
        templateData: {}, // You'd need to store and retrieve the original template data
      };

      // If templateId, use template
      if (originalEmail.templateId) {
        const template = EmailTemplates.getTemplate(originalEmail.templateId, {});
        if (template) {
          emailRequest.htmlBody = template.htmlBody;
          emailRequest.textBody = template.textBody;
        }
      }

      const messageId = await sesService.sendEmail(emailRequest);

      await emailRepository.updateEmailStatus(newEmailRecord.emailId, EmailStatus.SENT, {
        messageId,
        sentAt: Date.now(),
      });

      const response: SendEmailResponse = {
        success: true,
        emailId: newEmailRecord.emailId,
        messageId,
        message: 'Email resent successfully',
      };

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(response),
      };
    } catch (error) {
      await emailRepository.updateEmailStatus(newEmailRecord.emailId, EmailStatus.FAILED, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        failedAt: Date.now(),
      });

      throw error;
    }
  } catch (error) {
    console.error('Error resending email:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to resend email',
      }),
    };
  }
};