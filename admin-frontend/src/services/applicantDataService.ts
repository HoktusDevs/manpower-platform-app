/**
 * Applicant Data Service
 * Simulates access to applicant data from different frontend instances
 */

export interface ApplicantDocument {
  documentId: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  jobId: string;
  applicationId?: string;
  userId: string;
  fileSize: number;
  mimeType: string;
  status: string;
  createdAt: string;
  ocrResult?: Record<string, unknown>;
}

export interface ApplicantDataResponse {
  success: boolean;
  documents?: ApplicantDocument[];
  error?: string;
}

class ApplicantDataService {
  private baseUrl: string;

  constructor() {
    // Conectar directamente al backend OCR service
    this.baseUrl = 'https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev';
  }

  /**
   * Obtener documentos de postulantes - DATOS REALES
   */
  async getApplicantDocuments(): Promise<ApplicantDataResponse> {
    try {
      // Obtener documentos REALES desde localStorage del applicant-frontend
      const storedDocs = localStorage.getItem('user_documents');
      
      if (!storedDocs) {
        return {
          success: true,
          documents: [],
        };
      }

      const documents = JSON.parse(storedDocs);
      // Convertir formato de localStorage a ApplicantDocument
      const applicantDocuments: ApplicantDocument[] = documents.map((doc: Record<string, unknown>) => ({
        documentId: doc.documentId,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        documentType: doc.documentType,
        jobId: doc.jobId,
        applicationId: doc.applicationId,
        userId: doc.userId,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        status: doc.status || 'uploaded',
        createdAt: doc.createdAt || new Date().toISOString(),
        ocrResult: doc.ocrResult || null,
      }));

      return {
        success: true,
        documents: applicantDocuments,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener documentos por aplicación
   */
  async getDocumentsByApplication(applicationId: string): Promise<ApplicantDataResponse> {
    try {
      const response = await this.getApplicantDocuments();
      
      if (!response.success || !response.documents) {
        return {
          success: false,
          error: 'No se pudieron obtener los documentos',
        };
      }

      const applicationDocuments = response.documents.filter(
        doc => doc.applicationId === applicationId
      );

      return {
        success: true,
        documents: applicationDocuments,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener documentos por usuario
   */
  async getDocumentsByUser(userId: string): Promise<ApplicantDataResponse> {
    try {
      const response = await this.getApplicantDocuments();
      
      if (!response.success || !response.documents) {
        return {
          success: false,
          error: 'No se pudieron obtener los documentos',
        };
      }

      const userDocuments = response.documents.filter(
        doc => doc.userId === userId
      );

      return {
        success: true,
        documents: userDocuments,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener estadísticas de documentos
   */
  async getDocumentStats(): Promise<{ success: boolean; stats?: Record<string, unknown>; error?: string }> {
    try {
      const response = await this.getApplicantDocuments();
      
      if (!response.success || !response.documents) {
        return {
          success: false,
          error: 'No se pudieron obtener las estadísticas',
        };
      }

      const documents = response.documents;
      const stats = {
        totalDocuments: documents.length,
        completedDocuments: documents.filter(doc => doc.status === 'completed').length,
        processingDocuments: documents.filter(doc => doc.status === 'processing').length,
        failedDocuments: documents.filter(doc => doc.status === 'failed').length,
        totalSize: documents.reduce((sum, doc) => sum + doc.fileSize, 0),
        documentTypes: this.getDocumentTypeStats(documents),
        applications: this.getApplicationStats(documents),
      };

      return {
        success: true,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener estadísticas por tipo de documento
   */
  private getDocumentTypeStats(documents: ApplicantDocument[]): Record<string, number> {
    const stats: Record<string, number> = {};
    
    documents.forEach(doc => {
      stats[doc.documentType] = (stats[doc.documentType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Obtener estadísticas por aplicación
   */
  private getApplicationStats(documents: ApplicantDocument[]): Record<string, number> {
    const stats: Record<string, number> = {};
    
    documents.forEach(doc => {
      if (doc.applicationId) {
        stats[doc.applicationId] = (stats[doc.applicationId] || 0) + 1;
      }
    });

    return stats;
  }
}

export const applicantDataService = new ApplicantDataService();
