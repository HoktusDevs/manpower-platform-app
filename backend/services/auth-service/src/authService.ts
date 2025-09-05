import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { User, RegisterRequest, LoginRequest, AuthResponse, JWTPayload } from './types/auth';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

const USERS_TABLE = process.env.USERS_TABLE || 'manpower-users';

// Cache for JWT secret
let jwtSecret: string | null = null;

// Get JWT secret from Secrets Manager
async function getJWTSecret(): Promise<string> {
  if (jwtSecret) return jwtSecret;
  
  try {
    const command = new GetSecretValueCommand({
      SecretId: process.env.JWT_SECRET_ARN || 'manpower-jwt-secret'
    });
    
    const response = await secretsClient.send(command);
    const secret = JSON.parse(response.SecretString || '{}');
    jwtSecret = secret.jwtSecret || secret.password || 'fallback-secret-key';
    if (!jwtSecret) {
      throw new Error('JWT secret not found');
    }
    return jwtSecret;
  } catch (error) {
    console.warn('Failed to get JWT secret from Secrets Manager, using fallback');
    jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    return jwtSecret;
  }
}

// Password hashing utilities
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const passwordSalt = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, passwordSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: passwordSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Simple JWT implementation
function generateJWT(payload: JWTPayload, secret: string, expiresIn: number = 86400): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Remove validation functions (now handled by utils/validation.ts)

// Check if user exists by email
async function userExistsByEmail(email: string): Promise<boolean> {
  try {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase()
      },
      Select: 'COUNT'
    });
    
    const response = await docClient.send(command);
    return (response.Count || 0) > 0;
  } catch (error) {
    console.error('Error checking user existence:', error);
    throw new Error('Failed to check user existence');
  }
}

// Register user
export async function registerUser(request: RegisterRequest): Promise<AuthResponse> {
  console.log('Starting user registration for:', request.email);
  
  // Input validation is handled by the handler layer
  
  // Check if user already exists
  const exists = await userExistsByEmail(request.email);
  if (exists) {
    throw new Error('User with this email already exists');
  }
  
  // Hash password
  const { hash, salt } = hashPassword(request.password);
  const passwordHash = `${hash}:${salt}`;
  
  // Create user object
  const userId = uuidv4();
  const now = new Date().toISOString();
  
  const user: User = {
    userId,
    email: request.email.toLowerCase(),
    fullName: request.fullName.trim(),
    passwordHash,
    role: request.role,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    emailVerified: false
  };
  
  // Save to DynamoDB
  try {
    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: user,
      ConditionExpression: 'attribute_not_exists(userId)'
    });
    
    await docClient.send(command);
    console.log('User registered successfully:', userId);
  } catch (error) {
    console.error('Error saving user:', error);
    throw new Error('Failed to register user');
  }
  
  // Generate JWT token
  const jwtSecretKey = await getJWTSecret();
  const tokenPayload = {
    userId: user.userId,
    email: user.email,
    role: user.role
  };
  
  const expiresIn = 86400; // 24 hours
  const token = generateJWT(tokenPayload, jwtSecretKey, expiresIn);
  
  // Return response without password hash
  const { passwordHash: _, ...userResponse } = user;
  
  return {
    user: userResponse,
    token,
    expiresIn
  };
}

// Login user
export async function loginUser(request: LoginRequest): Promise<AuthResponse> {
  console.log('Starting user login for:', request.email);
  
  // Input validation is handled by the handler layer
  
  // Find user by email
  let user: User;
  try {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': request.email.toLowerCase()
      },
      Limit: 1
    });
    
    const response = await docClient.send(command);
    
    if (!response.Items || response.Items.length === 0) {
      throw new Error('Invalid email or password');
    }
    
    user = response.Items[0] as User;
  } catch (error) {
    console.error('Error finding user:', error);
    throw new Error('Invalid email or password');
  }
  
  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }
  
  // Verify password
  const [hash, salt] = user.passwordHash.split(':');
  if (!verifyPassword(request.password, hash, salt)) {
    throw new Error('Invalid email or password');
  }
  
  // Update last login time
  try {
    const updateCommand = new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        ...user,
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    
    await docClient.send(updateCommand);
  } catch (error) {
    console.warn('Failed to update last login time:', error);
    // Non-critical, don't fail the login
  }
  
  // Generate JWT token
  const jwtSecretKey = await getJWTSecret();
  const tokenPayload = {
    userId: user.userId,
    email: user.email,
    role: user.role
  };
  
  const expiresIn = 86400; // 24 hours
  const token = generateJWT(tokenPayload, jwtSecretKey, expiresIn);
  
  console.log('User logged in successfully:', user.userId);
  
  // Return response without password hash
  const { passwordHash: _, ...userResponse } = user;
  userResponse.lastLoginAt = new Date().toISOString();
  
  return {
    user: userResponse,
    token,
    expiresIn
  };
}