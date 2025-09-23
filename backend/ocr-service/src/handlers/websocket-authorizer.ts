import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

export const authorizer = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('WebSocket authorizer called:', event);
  
  // Permitir todas las conexiones
  return {
    principalId: 'anonymous',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn
        }
      ]
    }
  };
};
