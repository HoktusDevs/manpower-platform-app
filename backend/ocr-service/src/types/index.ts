export interface OCRDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  platformDocumentId: string;
  ownerUserName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  hoktusRequestId?: string;
  ocrResult?: OCRResult;
  error?: string;
}

export interface OCRResult {
  success: boolean;
  confidence: number;
  extractedText: string;
  language: string;
  processingTime: number;
  metadata: {
    width?: number;
    height?: number;
    format: string;
    size: number;
  };
  fields?: Record<string, any>;
}

export interface ProcessDocumentsRequest {
  owner_user_name: string;
  url_response: string;
  documents: Array<{
    file_name: string;
    file_url: string;
    platform_document_id: string;
  }>;
}

export interface ProcessDocumentsResponse {
  success: boolean;
  requestId: string;
  documents: Array<{
    id: string;
    platform_document_id: string;
    status: string;
  }>;
  message: string;
}

export interface HoktusCallbackRequest {
  requestId: string;
  documents: Array<{
    platform_document_id: string;
    status: 'completed' | 'failed';
    result?: OCRResult;
    error?: string;
  }>;
}

export interface HoktusCallbackResponse {
  success: boolean;
  message: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
