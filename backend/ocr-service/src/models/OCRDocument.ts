import { v4 as uuidv4 } from 'uuid';
import { OCRDocument, OCRResult } from '../types';

export class OCRDocumentModel {
  public id: string;
  public fileName: string;
  public fileUrl: string;
  public platformDocumentId: string;
  public ownerUserName: string;
  public status: 'pending' | 'processing' | 'completed' | 'failed';
  public createdAt: string;
  public updatedAt: string;
  public hoktusRequestId?: string;
  public ocrResult?: OCRResult;
  public error?: string;
  public hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  public hoktusProcessingStatus?: 'COMPLETED' | 'FAILED' | 'VALIDATION';
  public documentType?: string;
  public observations?: any[];

  constructor(data: Partial<OCRDocument>) {
    this.id = data.id || uuidv4();
    this.fileName = data.fileName || '';
    this.fileUrl = data.fileUrl || '';
    this.platformDocumentId = data.platformDocumentId || '';
    this.ownerUserName = data.ownerUserName || '';
    this.status = data.status || 'pending';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.hoktusRequestId = data.hoktusRequestId;
    this.ocrResult = data.ocrResult;
    this.error = data.error;
    this.hoktusDecision = data.hoktusDecision;
    this.hoktusProcessingStatus = data.hoktusProcessingStatus;
    this.documentType = data.documentType;
    this.observations = data.observations;
  }

  public toDynamoDB(): Record<string, any> {
    return {
      id: this.id,
      fileName: this.fileName,
      fileUrl: this.fileUrl,
      platformDocumentId: this.platformDocumentId,
      ownerUserName: this.ownerUserName,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      hoktusRequestId: this.hoktusRequestId,
      ocrResult: this.ocrResult ? JSON.stringify(this.ocrResult) : undefined,
      error: this.error,
      hoktusDecision: this.hoktusDecision,
      hoktusProcessingStatus: this.hoktusProcessingStatus,
      documentType: this.documentType,
      observations: this.observations ? JSON.stringify(this.observations) : undefined
    };
  }

  public static fromDynamoDB(item: Record<string, any>): OCRDocumentModel {
    return new OCRDocumentModel({
      id: item.id,
      fileName: item.fileName,
      fileUrl: item.fileUrl,
      platformDocumentId: item.platformDocumentId,
      ownerUserName: item.ownerUserName,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      hoktusRequestId: item.hoktusRequestId,
      ocrResult: item.ocrResult ? JSON.parse(item.ocrResult) : undefined,
      error: item.error,
      hoktusDecision: item.hoktusDecision,
      hoktusProcessingStatus: item.hoktusProcessingStatus,
      documentType: item.documentType,
      observations: item.observations ? JSON.parse(item.observations) : undefined
    });
  }

  public updateStatus(status: 'pending' | 'processing' | 'completed' | 'failed', error?: string): void {
    this.status = status;
    this.updatedAt = new Date().toISOString();
    if (error) {
      this.error = error;
    }
  }

  public setOCRResult(result: OCRResult): void {
    this.ocrResult = result;
    this.status = 'completed';
    this.updatedAt = new Date().toISOString();
  }

  public setHoktusRequestId(requestId: string): void {
    this.hoktusRequestId = requestId;
    this.status = 'processing';
    this.updatedAt = new Date().toISOString();
  }

  public setHoktusResult(hoktusData: {
    final_decision: string;
    processing_status: string;
    document_type?: string;
    observations?: any[];
  }): void {
    this.hoktusDecision = hoktusData.final_decision as any;
    this.hoktusProcessingStatus = hoktusData.processing_status as any;
    this.documentType = hoktusData.document_type;
    this.observations = hoktusData.observations;
    this.updatedAt = new Date().toISOString();
  }
}
