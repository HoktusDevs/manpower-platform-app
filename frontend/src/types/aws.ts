// AWS Types - Precise typing for AWS services and GraphQL

export interface GraphQLClient {
  query: (options: GraphQLQueryOptions) => Promise<GraphQLResponse>;
  mutate: (options: GraphQLMutationOptions) => Promise<GraphQLResponse>;
}

export interface GraphQLQueryOptions {
  query: string;
  variables?: GraphQLVariables;
}

export interface GraphQLMutationOptions {
  mutation: string;
  variables?: GraphQLVariables;
}

export interface GraphQLVariables {
  // Application variables
  userId?: string;
  applicationId?: string;
  companyName?: string;
  position?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW' | 'INTERVIEW_SCHEDULED' | 'HIRED';
  description?: string;
  salary?: string;
  location?: string;
  companyId?: string;
  
  // Update variables
  updates?: Partial<ApplicationData>;
  
  // Filter variables
  filter?: ApplicationFilter;
  limit?: number;
  nextToken?: string;
}

export interface GraphQLResponse<T = ApplicationGraphQLData> {
  data?: T;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
  extensions?: {
    code: string;
    exception?: {
      stacktrace: string[];
    };
  };
}

export interface ApplicationGraphQLData {
  getApplication?: ApplicationData;
  listApplications?: {
    items: ApplicationData[];
    nextToken?: string;
  };
  createApplication?: ApplicationData;
  updateApplication?: ApplicationData;
}

export interface ApplicationData {
  userId: string;
  applicationId: string;
  companyName: string;
  position: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW' | 'INTERVIEW_SCHEDULED' | 'HIRED';
  description?: string;
  salary?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  companyId?: string;
}

export interface ApplicationFilter {
  userId?: { eq: string };
  status?: { eq: string };
  companyName?: { contains: string };
  position?: { contains: string };
}

export interface DynamoDBExpressionAttributeValues {
  ':userId'?: string;
  ':applicationId'?: string;
  ':companyName'?: string;
  ':position'?: string;
  ':status'?: string;
  ':description'?: string;
  ':salary'?: string;
  ':location'?: string;
  ':companyId'?: string;
  ':currentUserId'?: string;
  ':updatedAt'?: string;
}