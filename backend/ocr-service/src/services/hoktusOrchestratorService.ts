import axios, { AxiosResponse } from 'axios';
import { ProcessDocumentsRequest, ProcessDocumentsResponse } from '../types';

export class HoktusOrchestratorService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.HOKTUS_ORCHESTRATOR_URL || 'https://hoktus-orchestrator-5504.com';
    this.timeout = 30000; // 30 seconds
  }

  async processDocuments(request: ProcessDocumentsRequest): Promise<ProcessDocumentsResponse> {
    try {
      const url = `${this.baseUrl}/api/v1/platform/process-documents-plataform`;
      
      console.log('=== ENVIANDO A HOKTUS ===');
      console.log('URL:', url);
      console.log('Request:', JSON.stringify(request, null, 2));
      console.log('========================');
      
      const response: AxiosResponse<ProcessDocumentsResponse> = await axios.post(url, request, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('=== RESPUESTA DE HOKTUS ===');
      console.log('Status:', response.status);
      console.log('Data:', JSON.stringify(response.data, null, 2));
      console.log('===========================');

      return response.data;
    } catch (error: any) {
      console.error('Error calling Hoktus Orchestrator:', error);
      
      if (error.response) {
        // Server responded with error status
        throw new Error(`Hoktus Orchestrator error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Hoktus Orchestrator is not responding');
      } else {
        // Something else happened
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
  }

  async downloadFileFromS3(fileUrl: string): Promise<Buffer> {
    try {
      // Parse S3 URL to get bucket and key
      const url = new URL(fileUrl);
      const bucket = url.hostname.split('.')[0];
      const key = url.pathname.substring(1); // Remove leading slash
      
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({ region: 'us-east-1' });
      
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });
      
      const response = await s3Client.send(command);
      const chunks: Uint8Array[] = [];
      
      // Read the stream
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      
      // Combine chunks into a single buffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return Buffer.from(result);
    } catch (error: any) {
      console.error('Error downloading file from S3:', error);
      throw new Error(`Failed to download file from S3: ${error.message}`);
    }
  }

  async uploadFileToHoktus(fileBuffer: Buffer, fileName: string): Promise<string> {
    try {
      // Crear FormData para enviar el archivo
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: this.getContentType(fileName)
      });

      const response = await axios.post(`${this.baseUrl}/api/v1/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json'
        },
        timeout: 60000 // 60 seconds for file upload
      });

      return response.data.fileUrl; // URL del archivo en Hoktus
    } catch (error: any) {
      console.error('Error uploading file to Hoktus:', error);
      throw new Error(`Failed to upload file to Hoktus: ${error.message}`);
    }
  }

  private getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff'
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.warn('Hoktus Orchestrator health check failed:', error);
      return false;
    }
  }

  buildCallbackUrl(): string {
    const baseUrl = process.env.CALLBACK_BASE_URL || 'https://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev';
    return `${baseUrl}/api/ocr/callback`;
  }
}
