/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

export const API_CONFIG = {
  folders: {
    baseUrl: import.meta.env.VITE_FOLDERS_API_URL || 'https://83upriwf35.execute-api.us-east-1.amazonaws.com/dev',
    endpoints: {
      base: '/folders',
      root: '/folders/root',
      batch: '/folders/batch',
      byId: (folderId: string) => `/folders/${folderId}`,
      children: (folderId: string) => `/folders/${folderId}/children`,
    }
  },
  applications: {
    baseUrl: import.meta.env.VITE_APPLICATIONS_API_URL || 'https://8lmunkvdd5.execute-api.us-east-1.amazonaws.com/dev',
    endpoints: {
      base: '/applications',
      my: '/applications/my',
      byId: (applicationId: string) => `/applications/${applicationId}`,
      stats: '/applications/stats',
      bulk: '/applications/bulk'
    }
  },
  ocr: {
    baseUrl: import.meta.env.VITE_OCR_API_URL || 'https://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev',
    endpoints: {
      processDocuments: '/api/ocr/process-documents-admin',
      health: '/api/ocr/health',
      documents: '/api/ocr/documents',
      documentById: (documentId: string) => `/api/ocr/document/${documentId}`,
      deleteDocument: (documentId: string) => `/api/ocr/delete/${documentId}`,
      notifyUpdate: '/api/ocr/notify-update'
    }
  },
  documentProcessing: {
    baseUrl: import.meta.env.VITE_DOCUMENT_PROCESSING_API_URL || 'https://sr4qzksrak.execute-api.us-east-1.amazonaws.com/dev',
    websocketUrl: import.meta.env.VITE_DOCUMENT_PROCESSING_WS_URL || 'wss://b3wt34nt9h.execute-api.us-east-1.amazonaws.com/dev',
    endpoints: {
      processDocuments: '/api/v1/platform/process-documents-platform',
      health: '/api/v1/health',
      websocketNotify: '/api/v1/websocket/notify'
    }
  }
} as const;

export type ApiConfig = typeof API_CONFIG;