import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export interface CognitoAuthStackProps extends cdk.StackProps {
  environment?: 'dev' | 'prod';
}

export class CognitoAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  // public readonly authorizer: apigateway.CognitoUserPoolsAuthorizer; // Not needed for direct Cognito auth

  constructor(scope: Construct, id: string, props: CognitoAuthStackProps = {}) {
    super(scope, id, props);

    const environment = props.environment || 'dev';

    // Custom attributes for roles and postulante data (existing schema will be used)

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'ManpowerUserPool', {
      userPoolName: `manpower-users-${environment}`,
      
      // Sign in configuration
      signInAliases: { 
        email: true,
        username: false 
      },
      signInCaseSensitive: false,
      
      // Self registration
      selfSignUpEnabled: true,
      
      // User verification
      userVerification: {
        emailSubject: 'Verificar tu cuenta en Manpower Platform',
        emailBody: 'Hola {username}, tu código de verificación es {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
        smsMessage: 'Tu código de verificación para Manpower Platform es {####}'
      },

      // Required attributes
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
        phoneNumber: {
          required: false,
          mutable: true,
        },
        address: {
          required: false,
          mutable: true,
        },
        birthdate: {
          required: false,
          mutable: true,
        },
      },

      // Custom attributes - match existing User Pool constraints
      customAttributes: {
        role: new cognito.StringAttribute({
          mutable: true
        }),
        rut: new cognito.StringAttribute({
          mutable: true
        }),
        education_level: new cognito.StringAttribute({
          mutable: true
        }),
        work_experience: new cognito.StringAttribute({
          mutable: true
        }),
        skills: new cognito.StringAttribute({
          mutable: true
        })
      },

      // Password policy
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },

      // MFA Configuration
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },

      // Account recovery
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // Lambda triggers for custom logic
      lambdaTriggers: environment === 'prod' ? {
        // Validate roles during registration
        preSignUp: this.createPreSignUpTrigger(environment),
        // Set custom attributes after registration
        postConfirmation: this.createPostConfirmationTrigger(environment),
        // CRITICAL: Include custom:role in JWT tokens
        preTokenGeneration: this.createPreTokenGenerationTrigger(environment),
      } : {
        // Auto-confirm users in development
        preSignUp: this.createAutoConfirmTrigger(environment),
        // Add users to groups in development (same as prod)
        postConfirmation: this.createPostConfirmationTrigger(environment),
        // CRITICAL: Include custom:role in JWT tokens (dev)
        preTokenGeneration: this.createPreTokenGenerationTrigger(environment),
      },

      // Deletion protection for production
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // User Pool Client for web application
    this.userPoolClient = new cognito.UserPoolClient(this, 'ManpowerWebClient', {
      userPool: this.userPool,
      userPoolClientName: `manpower-web-client-${environment}`,
      
      // Authentication flows
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        custom: false,
        userPassword: false, // Disable for security
      },

      // OAuth flows
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false, // More secure
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: environment === 'prod' 
          ? ['https://app.manpower.com/auth/callback']
          : ['http://localhost:5173/auth/callback', 'http://localhost:3000/auth/callback'],
        logoutUrls: environment === 'prod'
          ? ['https://app.manpower.com/']
          : ['http://localhost:5173/', 'http://localhost:3000/'],
      },

      // Token validity
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),

      // Security
      preventUserExistenceErrors: true,
      generateSecret: false, // For web apps
      
      // Attributes - CRITICAL: Include all custom attributes in tokens
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          emailVerified: true,
          givenName: true,
          familyName: true,
          phoneNumber: true,
          address: true,
          birthdate: true,
        })
        .withCustomAttributes('role', 'rut', 'education_level', 'work_experience', 'skills'),

      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true,
          phoneNumber: true,
          address: true,
          birthdate: true,
        })
        .withCustomAttributes('role', 'rut', 'education_level', 'work_experience', 'skills'),
    });

    // Identity Pool for AWS resource access
    this.identityPool = new cognito.CfnIdentityPool(this, 'ManpowerIdentityPool', {
      identityPoolName: `manpower_identity_pool_${environment}`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: this.userPoolClient.userPoolClientId,
        providerName: this.userPool.userPoolProviderName,
      }],
    });

    // IAM roles for authenticated users
    const authenticatedRole = new iam.Role(this, 'CognitoAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        'StringEquals': {
          'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'authenticated',
        },
      }),
      description: 'Role for authenticated Cognito users',
    });

    // Basic permissions for authenticated users
    authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-identity:GetCredentialsForIdentity',
        'cognito-idp:GetUser',
        'cognito-idp:UpdateUserAttributes',
      ],
      resources: ['*'],
    }));

    // Attach roles to Identity Pool (using L1 construct)
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        'authenticated': authenticatedRole.roleArn,
      },
    });

    // API Gateway Authorizer (commented out - will be created when needed by API stacks)
    // this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ManpowerAuthorizer', {
    //   cognitoUserPools: [this.userPool],
    //   authorizerName: `manpower-authorizer-${environment}`,
    //   identitySource: 'method.request.header.Authorization',
    // });

    // User Groups for role-based access
    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'admin',
      description: 'Administrators with full access',
      precedence: 1,
    });

    new cognito.CfnUserPoolGroup(this, 'PostulanteGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'postulante',
      description: 'Job applicants with limited access',
      precedence: 2,
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `ManpowerUserPoolId-${environment}`
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `ManpowerUserPoolClientId-${environment}`
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'Cognito Identity Pool ID',
      exportName: `ManpowerIdentityPoolId-${environment}`
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}`,
      description: 'Cognito User Pool Domain',
      exportName: `ManpowerUserPoolDomain-${environment}`
    });
  }

  private createPreSignUpTrigger(environment: string): lambda.Function {
    return new lambda.Function(this, 'PreSignUpTrigger', {
      functionName: `manpower-pre-signup-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('PreSignUp trigger:', JSON.stringify(event, null, 2));
          
          // Validate role attribute
          const role = event.request.userAttributes['custom:role'];
          if (!role || !['admin', 'postulante'].includes(role)) {
            throw new Error('Invalid role. Must be admin or postulante');
          }
          
          // Auto-confirm all users for simplified UX
          event.response.autoConfirmUser = true;
          event.response.autoVerifyEmail = true;
          
          return event;
        };
      `),
      environment: {
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.seconds(30),
    });
  }

  private createPostConfirmationTrigger(environment: string): lambda.Function {
    const postConfirmationFunction = new lambda.Function(this, 'PostConfirmationTrigger', {
      functionName: `manpower-post-confirmation-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('PostConfirmation trigger:', JSON.stringify(event, null, 2));

          try {
            const role = event.request.userAttributes['custom:role'];
            const userPoolId = event.userPoolId;
            const username = event.userName;

            // Add user to appropriate group
            if (role === 'admin' || role === 'postulante') {
              // Use AWS SDK v3 that comes with Lambda runtime
              const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');

              const cognitoClient = new CognitoIdentityProviderClient({
                region: process.env.COGNITO_REGION || process.env.AWS_REGION
              });

              const addToGroupCommand = new AdminAddUserToGroupCommand({
                UserPoolId: userPoolId,
                Username: username,
                GroupName: role
              });

              await cognitoClient.send(addToGroupCommand);
              console.log(\`User \${username} added to \${role} group\`);
            }

            return event;
          } catch (error) {
            console.error('Error in PostConfirmation trigger:', error);
            // Don't throw error to avoid breaking user registration
            return event;
          }
        };
      `),
      environment: {
        COGNITO_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions to add users to groups - use wildcard for User Pool ARN
    postConfirmationFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:AdminAddUserToGroup'],
      resources: [`arn:aws:cognito-idp:${this.region}:${this.account}:userpool/*`],
    }));

    return postConfirmationFunction;
  }

  private createAutoConfirmTrigger(environment: string): lambda.Function {
    return new lambda.Function(this, 'AutoConfirmTrigger', {
      functionName: `manpower-auto-confirm-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('AutoConfirm trigger:', JSON.stringify(event, null, 2));
          
          // Validate role attribute
          const role = event.request.userAttributes['custom:role'];
          if (!role || !['admin', 'postulante'].includes(role)) {
            throw new Error('Invalid role. Must be admin or postulante');
          }
          
          // Auto-confirm user in development
          event.response.autoConfirmUser = true;
          event.response.autoVerifyEmail = true;
          
          return event;
        };
      `),
      environment: {
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.seconds(30),
    });
  }

  /**
   * CRITICAL: Lambda trigger to include custom:role in JWT tokens
   * This ensures GraphQL resolvers can access the role claim
   */
  private createPreTokenGenerationTrigger(environment: string): lambda.Function {
    return new lambda.Function(this, 'PreTokenGenerationTrigger', {
      functionName: `manpower-pre-token-generation-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('PreTokenGeneration trigger:', JSON.stringify(event, null, 2));
          
          try {
            // Get custom:role from user attributes
            const role = event.request.userAttributes['custom:role'];
            
            if (role) {
              // Add custom:role to both ID and Access tokens
              if (event.request.groupConfiguration) {
                event.request.groupConfiguration.groupsToOverride = [];
                event.request.groupConfiguration.iamRolesToOverride = [];
                event.request.groupConfiguration.preferredRole = null;
              }
              
              // Add custom:role claim to ID token
              if (!event.response.claimsOverride) {
                event.response.claimsOverride = {};
              }
              if (!event.response.claimsOverride.idTokenGeneration) {
                event.response.claimsOverride.idTokenGeneration = {};
              }
              if (!event.response.claimsOverride.idTokenGeneration.claimsToAddOrOverride) {
                event.response.claimsOverride.idTokenGeneration.claimsToAddOrOverride = {};
              }
              
              // Add the role claim to ID token (this is what GraphQL reads)
              event.response.claimsOverride.idTokenGeneration.claimsToAddOrOverride['custom:role'] = role;
              
              // Also add to Access token for good measure
              if (!event.response.claimsOverride.accessTokenGeneration) {
                event.response.claimsOverride.accessTokenGeneration = {};
              }
              if (!event.response.claimsOverride.accessTokenGeneration.claimsToAddOrOverride) {
                event.response.claimsOverride.accessTokenGeneration.claimsToAddOrOverride = {};
              }
              event.response.claimsOverride.accessTokenGeneration.claimsToAddOrOverride['custom:role'] = role;
              
              console.log(\`✅ Added custom:role="\${role}" to JWT tokens\`);
            } else {
              console.warn('⚠️ No custom:role found in user attributes');
            }
            
            return event;
          } catch (error) {
            console.error('❌ Error in PreTokenGeneration:', error);
            throw error;
          }
        };
      `),
      timeout: cdk.Duration.seconds(30),
    });
  }
}