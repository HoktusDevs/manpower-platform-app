import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface SecurityStackProps extends cdk.StackProps {
  environment: 'dev' | 'prod';
}

export class SecurityStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly kmsKey: kms.Key;
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly secrets: { [key: string]: secretsmanager.Secret };
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  
  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    // VPC with private subnets for sensitive operations
    this.vpc = new ec2.Vpc(this, 'ManpowerVPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 3,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // VPC Flow Logs for security monitoring
    new ec2.FlowLog(this, 'VPCFlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      trafficType: ec2.FlowLogTrafficType.ALL,
    });

    // KMS Key for encryption at rest
    this.kmsKey = new kms.Key(this, 'ManpowerEncryptionKey', {
      description: 'Manpower Platform encryption key for sensitive data',
      enableKeyRotation: true,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            sid: 'Enable IAM User Permissions',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*']
          }),
          new iam.PolicyStatement({
            sid: 'Allow DynamoDB Service',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('dynamodb.amazonaws.com')],
            actions: [
              'kms:Decrypt',
              'kms:DescribeKey',
              'kms:Encrypt',
              'kms:GenerateDataKey*',
              'kms:ReEncrypt*'
            ],
            resources: ['*']
          }),
          new iam.PolicyStatement({
            sid: 'Allow S3 Service',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
            actions: [
              'kms:Decrypt',
              'kms:DescribeKey',
              'kms:Encrypt',
              'kms:GenerateDataKey*',
              'kms:ReEncrypt*'
            ],
            resources: ['*']
          })
        ]
      }),
      removalPolicy: props.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // KMS Key Alias
    new kms.Alias(this, 'ManpowerKeyAlias', {
      aliasName: `alias/manpower-${props.environment}`,
      targetKey: this.kmsKey
    });

    // Secrets Manager for sensitive configuration
    this.secrets = {};

    // Database credentials
    this.secrets.dbCredentials = new secretsmanager.Secret(this, 'DatabaseCredentials', {
      description: 'Database connection credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\'
      },
      encryptionKey: this.kmsKey
    });

    // JWT signing secrets
    this.secrets.jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
      description: 'JWT signing secret',
      generateSecretString: {
        excludeCharacters: '"@/\\',
        includeSpace: false,
        passwordLength: 64
      },
      encryptionKey: this.kmsKey
    });

    // API keys and external service credentials
    this.secrets.apiKeys = new secretsmanager.Secret(this, 'APIKeys', {
      description: 'External API keys and service credentials',
      secretStringValue: cdk.SecretValue.unsafePlainText('{}'),
      encryptionKey: this.kmsKey
    });

    // Encryption key for file uploads
    this.secrets.fileEncryptionKey = new secretsmanager.Secret(this, 'FileEncryptionKey', {
      description: 'File encryption key for sensitive documents',
      generateSecretString: {
        excludeCharacters: '"@/\\',
        includeSpace: false,
        passwordLength: 32
      },
      encryptionKey: this.kmsKey
    });

    // Security Groups
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true
    });

    // VPC Endpoints for AWS services (reduce data egress costs and improve security)
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }]
    });

    this.vpc.addGatewayEndpoint('DynamoDBEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }]
    });

    // Interface endpoints for other AWS services
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this.lambdaSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint('KMSEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.KMS,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this.lambdaSecurityGroup]
    });

    // WAF Web ACL for CloudFront and API Gateway protection
    this.webAcl = new wafv2.CfnWebACL(this, 'ManpowerWebACL', {
      name: `manpower-web-acl-${props.environment}`,
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      description: 'WAF rules for Manpower Platform protection',
      rules: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules: []
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSetMetric'
          }
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet'
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputsRuleSetMetric'
          }
        },
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet'
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'SQLiRuleSetMetric'
          }
        },
        {
          name: 'RateLimitRule',
          priority: 4,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: props.environment === 'prod' ? 2000 : 1000,
              aggregateKeyType: 'IP'
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule'
          }
        }
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'ManpowerWebACL'
      }
    });

    // Output important resources
    new cdk.CfnOutput(this, 'VPCId', {
      value: this.vpc.vpcId,
      exportName: 'ManpowerVPCId'
    });

    new cdk.CfnOutput(this, 'KMSKeyId', {
      value: this.kmsKey.keyId,
      exportName: 'ManpowerKMSKeyId'
    });

    new cdk.CfnOutput(this, 'KMSKeyArn', {
      value: this.kmsKey.keyArn,
      exportName: 'ManpowerKMSKeyArn'
    });

    new cdk.CfnOutput(this, 'WebACLArn', {
      value: this.webAcl.attrArn,
      exportName: 'ManpowerWebACLArn'
    });

    new cdk.CfnOutput(this, 'JWTSecretArn', {
      value: this.secrets.jwtSecret.secretArn,
      exportName: 'ManpowerJWTSecretArn'
    });

    new cdk.CfnOutput(this, 'FileEncryptionSecretArn', {
      value: this.secrets.fileEncryptionKey.secretArn,
      exportName: 'ManpowerFileEncryptionSecretArn'
    });
  }
}