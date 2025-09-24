export interface OCRResult {
  success: boolean;
  text: string;
  confidence: number;
  processingTime: number;
  language: string;
  metadata: any;
  fields?: any;
}

export interface DocumentFile {
  id: string;
  file: File;
  previewUrl: string;
  fileUrl?: string; // ✅ URL real del archivo desde la base de datos
  title: string;
  ownerName: string; // ✅ NOMBRE POR CADA ARCHIVO
  ocrResult?: OCRResult;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'failed';
  hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING';
  hoktusProcessingStatus?: 'COMPLETED' | 'FAILED' | 'VALIDATION' | 'PROCESSING';
  documentType?: string;
  observations?: any[];
}

export interface OCRResultsTableProps {
  documents: DocumentFile[];
  onDeleteDocument?: (documentId: string) => void;
  onPreviewDocument?: (document: DocumentFile) => void;
  isLoading?: boolean;
}
