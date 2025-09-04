import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface StorageStackProps extends cdk.StackProps {
  kmsKey?: kms.Key;
  environment?: 'dev' | 'prod';
}

export class StorageStack extends cdk.Stack {
  public readonly filesBucket: s3.Bucket;
  public readonly tempBucket: s3.Bucket;
  public readonly virusScanBucket: s3.Bucket;
  public readonly archiveBucket: s3.Bucket;
  public readonly fileProcessingQueue: sqs.Queue;
  public readonly virusScanQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const environment: 'dev' | 'prod' = props.environment || 'dev';
    const kmsKey: kms.Key = props.kmsKey || new kms.Key(this, 'StorageKMSKey', {
      description: 'KMS Key for storage encryption',
      enableKeyRotation: true
    });

    // Dead letter queue for failed file processing
    const fileProcessingDLQ = new sqs.Queue(this, 'FileProcessingDLQ', {
      queueName: `manpower-file-processing-dlq-${environment}`,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: kmsKey,
      retentionPeriod: cdk.Duration.days(14)
    });

    // Main file processing queue (handles 15K+ daily uploads)
    this.fileProcessingQueue = new sqs.Queue(this, 'FileProcessingQueue', {
      queueName: `manpower-file-processing-${environment}`,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: kmsKey,
      visibilityTimeout: cdk.Duration.minutes(15),
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Long polling
      deadLetterQueue: {
        queue: fileProcessingDLQ,
        maxReceiveCount: 3
      },
      // High throughput settings for 15K daily uploads
      ...(environment === 'prod' && {
        fifo: false, // Standard queue for higher throughput
      })
    });

    // Virus scan queue for security
    this.virusScanQueue = new sqs.Queue(this, 'VirusScanQueue', {
      queueName: `manpower-virus-scan-${environment}`,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: kmsKey,
      visibilityTimeout: cdk.Duration.minutes(10),
      receiveMessageWaitTime: cdk.Duration.seconds(20)
    });

    // Temporary upload bucket (presigned URLs, auto-cleanup)
    this.tempBucket = new s3.Bucket(this, 'TempBucket', {
      bucketName: `manpower-temp-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}-${environment}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteTempFilesAfter24Hours',
          expiration: cdk.Duration.hours(24),
          enabled: true
        },
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
          enabled: true
        }
      ],
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD
          ],
          allowedOrigins: ['*'], // Will be restricted by presigned URL
          allowedHeaders: ['*'],
          maxAge: 300
        }
      ],
      transferAcceleration: true, // Critical for 15K daily uploads
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Virus scanning bucket (quarantine area)
    this.virusScanBucket = new s3.Bucket(this, 'VirusScanBucket', {
      bucketName: `manpower-virus-scan-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}-${environment}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteScannedFilesAfter7Days',
          expiration: cdk.Duration.days(7),
          enabled: true
        }
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Main production files bucket (post virus-scan)
    this.filesBucket = new s3.Bucket(this, 'FilesBucket', {
      bucketName: `manpower-files-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}-${environment}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'TransitionToIA',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90)
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(365)
            }
          ]
        },
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
          enabled: true
        }
      ],
      // Optimized for high-volume access
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD
          ],
          allowedOrigins: ['*'], // CloudFront will restrict this
          allowedHeaders: ['*'],
          maxAge: 3600
        }
      ],
      transferAcceleration: true,
      // Request metrics for monitoring high throughput
      metrics: [
        {
          id: 'EntireBucketMetrics',
        }
      ],
      // Intelligence tiering for cost optimization
      intelligentTieringConfigurations: [
        {
          name: 'EntireBucketIntelligentTiering'
        }
      ],
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Long-term archive bucket (compliance & backup)
    this.archiveBucket = new s3.Bucket(this, 'ArchiveBucket', {
      bucketName: `manpower-archive-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}-${environment}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'ArchiveLifecycle',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(1)
            }
          ],
          expiration: environment === 'prod' ? cdk.Duration.days(2555) : cdk.Duration.days(365) // 7 years prod, 1 year dev
        }
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // S3 Event notifications for automated processing
    this.tempBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(this.fileProcessingQueue),
      { prefix: 'uploads/' }
    );

    this.tempBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(this.virusScanQueue),
      { prefix: 'uploads/' }
    );

    // Bucket notifications for virus scan completion
    this.virusScanBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(this.fileProcessingQueue),
      { prefix: 'clean/', suffix: '.metadata' }
    );

    // Bucket policies for presigned URL access
    const presignedUrlPolicy = new iam.PolicyStatement({
      sid: 'AllowPresignedUrlAccess',
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('lambda.amazonaws.com')],
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject'
      ],
      resources: [
        `${this.tempBucket.bucketArn}/*`,
        `${this.filesBucket.bucketArn}/*`
      ],
      conditions: {
        StringEquals: {
          's3:x-amz-server-side-encryption': 'aws:kms',
          's3:x-amz-server-side-encryption-aws-kms-key-id': kmsKey.keyArn
        }
      }
    });

    // CloudWatch Alarms for monitoring high-volume uploads
    if (environment === 'prod') {
      const uploadRate = new cdk.aws_cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: 'NumberOfObjects',
        dimensionsMap: {
          BucketName: this.tempBucket.bucketName,
          StorageType: 'AllStorageTypes'
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      });

      new cdk.aws_cloudwatch.Alarm(this, 'HighUploadRateAlarm', {
        alarmName: 'Manpower-High-Upload-Rate',
        alarmDescription: 'Alert when upload rate exceeds expected threshold',
        metric: uploadRate,
        threshold: 100, // 100 uploads per 5-minute period = 28,800 daily (well above 15K target)
        evaluationPeriods: 2,
        treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }

    // Outputs
    new cdk.CfnOutput(this, 'FilesBucketName', {
      value: this.filesBucket.bucketName,
      exportName: `Manpower-FilesBucket-${environment}`
    });

    new cdk.CfnOutput(this, 'TempBucketName', {
      value: this.tempBucket.bucketName,
      exportName: `Manpower-TempBucket-${environment}`
    });

    new cdk.CfnOutput(this, 'VirusScanBucketName', {
      value: this.virusScanBucket.bucketName,
      exportName: `Manpower-VirusScanBucket-${environment}`
    });

    new cdk.CfnOutput(this, 'ArchiveBucketName', {
      value: this.archiveBucket.bucketName,
      exportName: `Manpower-ArchiveBucket-${environment}`
    });

    new cdk.CfnOutput(this, 'FileProcessingQueueUrl', {
      value: this.fileProcessingQueue.queueUrl,
      exportName: `Manpower-FileProcessingQueue-${environment}`
    });

    new cdk.CfnOutput(this, 'VirusScanQueueUrl', {
      value: this.virusScanQueue.queueUrl,
      exportName: `Manpower-VirusScanQueue-${environment}`
    });
  }
}