// Configuración del WebSocket para diferentes entornos
export const WEBSOCKET_CONFIG = {
  development: {
    url: 'wss://axt7p628rd.execute-api.us-east-1.amazonaws.com/dev',
    reconnectInterval: 3000,
    maxReconnectAttempts: 3,
    pingInterval: 30000
  },
  staging: {
    url: 'wss://staging-websocket.manpower-platform.com',
    reconnectInterval: 3000,
    maxReconnectAttempts: 3,
    pingInterval: 30000
  },
  production: {
    url: 'wss://websocket.manpower-platform.com',
    reconnectInterval: 3000,
    maxReconnectAttempts: 3,
    pingInterval: 30000
  }
};

// Función para obtener la configuración del WebSocket según el entorno
export const getWebSocketConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  // En desarrollo, siempre usar la URL de desarrollo
  if (env === 'development') {
    return WEBSOCKET_CONFIG.development;
  }
  
  // En staging/production, usar las URLs correspondientes
  return WEBSOCKET_CONFIG[env as keyof typeof WEBSOCKET_CONFIG] || WEBSOCKET_CONFIG.development;
};

// Función para verificar si el WebSocket está disponible
export const isWebSocketSupported = (): boolean => {
  return typeof WebSocket !== 'undefined';
};

// Función para obtener el estado de conexión del WebSocket
export const getWebSocketStatus = (ws: WebSocket | null): 'connecting' | 'open' | 'closing' | 'closed' => {
  if (!ws) return 'closed';
  
  switch (ws.readyState) {
    case WebSocket.CONNECTING:
      return 'connecting';
    case WebSocket.OPEN:
      return 'open';
    case WebSocket.CLOSING:
      return 'closing';
    case WebSocket.CLOSED:
    default:
      return 'closed';
  }
};
