/**
 * WebSocket notification service for real-time updates
 */

const WEBSOCKET_ENDPOINT = process.env.WEBSOCKET_ENDPOINT || 'https://ni9nq1nd38.execute-api.us-east-1.amazonaws.com/dev';

// Interface removed - using inline types

/**
 * Notify WebSocket service about file changes for real-time updates
 */
export const notifyWebSocket = async (
  action: 'file_created' | 'file_updated' | 'file_deleted',
  data: {
    fileId: string;
    folderId: string;
    file?: any;
  }
): Promise<void> => {
  try {
    console.log(`📡 Sending WebSocket notification: ${action} for file ${data.fileId}`);

    // Send notification to WebSocket broadcast endpoint
    // CRITICAL: Must match existing broadcast endpoint format
    const response = await fetch(`${WEBSOCKET_ENDPOINT}/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        data: {
          fileId: data.fileId,
          folderId: data.folderId,
          userId: 'system',
          eventType: action === 'file_created' ? 'INSERT' : action === 'file_updated' ? 'MODIFY' : 'REMOVE',
          file: data.file,
          timestamp: Date.now()
        }
      })
    });

    if (response.ok) {
      console.log('✅ WebSocket notification sent successfully');
    } else {
      const errorText = await response.text();
      console.error(`❌ WebSocket notification failed: ${response.status} ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Error sending WebSocket notification:', error);
    // Don't throw error - WebSocket notification is optional
  }
};