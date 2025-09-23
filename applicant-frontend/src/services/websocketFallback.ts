/**
 * WebSocket Fallback Service
 * Provides polling fallback when WebSocket is not available
 */

export interface WebSocketFallbackOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pollingInterval?: number;
}

export class WebSocketFallbackService {
  private websocket: WebSocket | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000;
  private pollingIntervalMs: number = 10000; // 10 seconds
  private messageHandlers: Map<string, (message: unknown) => void> = new Map();
  private isPolling: boolean = false;
  private lastDocumentStatus: Map<string, string> = new Map();

  constructor(private options: WebSocketFallbackOptions) {
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.pollingIntervalMs = options.pollingInterval || 10000;
  }

  /**
   * Connect with WebSocket, fallback to polling
   */
  async connect(): Promise<boolean> {
    try {
      // Try WebSocket first
      const wsConnected = await this.connectWebSocket();
      if (wsConnected) {
        console.log('WebSocket connected successfully');
        return true;
      }
    } catch (error) {
      console.warn('WebSocket connection failed, falling back to polling:', error);
    }

    // Fallback to polling
    this.startPolling();
    return true;
  }

  /**
   * Try to connect WebSocket
   */
  private async connectWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.websocket = new WebSocket(this.options.url);

        this.websocket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.stopPolling();
          resolve(true);
        };

        this.websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.websocket.onclose = () => {
          console.log('WebSocket disconnected');
          this.websocket = null;
          this.attemptReconnect();
        };

        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          resolve(false);
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (this.websocket?.readyState !== WebSocket.OPEN) {
            this.websocket?.close();
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('Error creating WebSocket:', error);
        resolve(false);
      }
    });
  }

  /**
   * Start polling as fallback
   */
  private startPolling(): void {
    if (this.isPolling) return;
    
    this.isPolling = true;
    console.log('Starting polling fallback');
    
    this.pollingInterval = setInterval(() => {
      this.pollDocumentUpdates();
    }, this.pollingIntervalMs);
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  /**
   * Poll for document updates
   */
  private async pollDocumentUpdates(): Promise<void> {
    try {
      // This would need to be implemented based on your backend API
      // For now, we'll simulate checking document status
      console.log('Polling for document updates...');
      
      // In a real implementation, you would:
      // 1. Get list of documents being processed
      // 2. Check their status
      // 3. Notify handlers of any changes
      
    } catch (error) {
      console.error('Error polling document updates:', error);
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect WebSocket... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, this.reconnectInterval);
    } else {
      console.log('Max reconnection attempts reached, staying with polling');
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: unknown): void {
    console.log('WebSocket message received:', message);
    
    // Notify all handlers
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  /**
   * Register message handler
   */
  onMessage(type: string, handler: (message: unknown) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove message handler
   */
  offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Send message (WebSocket only)
   */
  send(message: unknown): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not available, message not sent:', message);
    }
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.stopPolling();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return (this.websocket?.readyState === WebSocket.OPEN) || this.isPolling;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'websocket' | 'polling' | 'disconnected' {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return 'websocket';
    } else if (this.isPolling) {
      return 'polling';
    } else {
      return 'disconnected';
    }
  }
}
