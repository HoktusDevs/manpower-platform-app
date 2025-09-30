import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { EmailRecord, EmailStatus, EmailHistoryQuery, EmailHistoryResponse } from '../types/email.types';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

export class EmailRepository {
  private readonly tableName: string;

  constructor() {
    this.tableName = process.env.EMAILS_TABLE || 'emails-dev';
  }

  async createEmailRecord(data: Partial<EmailRecord>): Promise<EmailRecord> {
    const now = Date.now();
    const emailRecord: EmailRecord = {
      emailId: uuidv4(),
      recipientEmail: data.recipientEmail || '',
      recipientName: data.recipientName,
      subject: data.subject || '',
      status: data.status || EmailStatus.PENDING,
      templateId: data.templateId,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
      ttl: Math.floor(now / 1000) + (90 * 24 * 60 * 60), // 90 days TTL
    };

    await docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: emailRecord,
    }));

    return emailRecord;
  }

  async getEmailRecord(emailId: string): Promise<EmailRecord | null> {
    const response = await docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { emailId },
    }));

    return response.Item as EmailRecord || null;
  }

  async updateEmailStatus(
    emailId: string,
    status: EmailStatus,
    additionalData?: {
      messageId?: string;
      errorMessage?: string;
      sentAt?: number;
      deliveredAt?: number;
      failedAt?: number;
    }
  ): Promise<void> {
    const updateExpressions: string[] = ['#status = :status', '#updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = {
      '#status': 'status',
      '#updatedAt': 'updatedAt',
    };
    const expressionAttributeValues: Record<string, unknown> = {
      ':status': status,
      ':updatedAt': Date.now(),
    };

    if (additionalData?.messageId) {
      updateExpressions.push('#messageId = :messageId');
      expressionAttributeNames['#messageId'] = 'messageId';
      expressionAttributeValues[':messageId'] = additionalData.messageId;
    }

    if (additionalData?.errorMessage) {
      updateExpressions.push('#errorMessage = :errorMessage');
      expressionAttributeNames['#errorMessage'] = 'errorMessage';
      expressionAttributeValues[':errorMessage'] = additionalData.errorMessage;
    }

    if (additionalData?.sentAt) {
      updateExpressions.push('#sentAt = :sentAt');
      expressionAttributeNames['#sentAt'] = 'sentAt';
      expressionAttributeValues[':sentAt'] = additionalData.sentAt;
    }

    if (additionalData?.deliveredAt) {
      updateExpressions.push('#deliveredAt = :deliveredAt');
      expressionAttributeNames['#deliveredAt'] = 'deliveredAt';
      expressionAttributeValues[':deliveredAt'] = additionalData.deliveredAt;
    }

    if (additionalData?.failedAt) {
      updateExpressions.push('#failedAt = :failedAt');
      expressionAttributeNames['#failedAt'] = 'failedAt';
      expressionAttributeValues[':failedAt'] = additionalData.failedAt;
    }

    await docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { emailId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  async getEmailHistory(query: EmailHistoryQuery): Promise<EmailHistoryResponse> {
    const limit = query.limit || 50;

    if (query.recipientEmail) {
      // Query by recipientEmail using GSI
      const params: any = {
        TableName: this.tableName,
        IndexName: 'recipientEmail-createdAt-index',
        KeyConditionExpression: '#recipientEmail = :recipientEmail',
        ExpressionAttributeNames: {
          '#recipientEmail': 'recipientEmail',
        },
        ExpressionAttributeValues: {
          ':recipientEmail': query.recipientEmail,
        },
        Limit: limit,
        ScanIndexForward: false, // Sort by createdAt descending
        ExclusiveStartKey: query.lastEvaluatedKey,
      };

      if (query.startDate && query.endDate) {
        params.KeyConditionExpression += ' AND #createdAt BETWEEN :startDate AND :endDate';
        params.ExpressionAttributeNames['#createdAt'] = 'createdAt';
        params.ExpressionAttributeValues[':startDate'] = query.startDate;
        params.ExpressionAttributeValues[':endDate'] = query.endDate;
      } else if (query.startDate) {
        params.KeyConditionExpression += ' AND #createdAt >= :startDate';
        params.ExpressionAttributeNames['#createdAt'] = 'createdAt';
        params.ExpressionAttributeValues[':startDate'] = query.startDate;
      }

      if (query.status) {
        params.FilterExpression = '#status = :status';
        params.ExpressionAttributeNames['#status'] = 'status';
        params.ExpressionAttributeValues[':status'] = query.status;
      }

      const response = await docClient.send(new QueryCommand(params));

      return {
        emails: response.Items as EmailRecord[],
        lastEvaluatedKey: response.LastEvaluatedKey,
        count: response.Count || 0,
      };
    } else {
      // Scan all records (use with caution in production)
      const params: any = {
        TableName: this.tableName,
        Limit: limit,
        ExclusiveStartKey: query.lastEvaluatedKey,
      };

      const filterExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, unknown> = {};

      if (query.status) {
        filterExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = query.status;
      }

      if (query.startDate) {
        filterExpressions.push('#createdAt >= :startDate');
        expressionAttributeNames['#createdAt'] = 'createdAt';
        expressionAttributeValues[':startDate'] = query.startDate;
      }

      if (query.endDate) {
        filterExpressions.push('#createdAt <= :endDate');
        expressionAttributeNames['#createdAt'] = 'createdAt';
        expressionAttributeValues[':endDate'] = query.endDate;
      }

      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
        params.ExpressionAttributeNames = expressionAttributeNames;
        params.ExpressionAttributeValues = expressionAttributeValues;
      }

      const response = await docClient.send(new ScanCommand(params));

      return {
        emails: response.Items as EmailRecord[],
        lastEvaluatedKey: response.LastEvaluatedKey,
        count: response.Count || 0,
      };
    }
  }
}