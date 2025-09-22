export interface Application {
  applicationId: string;
  userId: string;
  jobId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';
  description?: string;
  createdAt: string;
  updatedAt: string;
  documents?: string[]; // Array of document URLs
}

export interface ApplicationModel {
  applicationId: string;
  userId: string;
  jobId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';
  description?: string;
  createdAt: string;
  updatedAt: string;
  documents?: string[];
}

export class ApplicationModel {
  applicationId: string;
  userId: string;
  jobId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';
  description?: string;
  createdAt: string;
  updatedAt: string;
  documents?: string[];

  constructor(data: Partial<ApplicationModel>) {
    this.applicationId = data.applicationId || '';
    this.userId = data.userId || '';
    this.jobId = data.jobId || '';
    this.status = data.status || 'PENDING';
    this.description = data.description;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.documents = data.documents || [];
  }

  isValid(): boolean {
    return !!(this.applicationId && this.userId && this.jobId);
  }

  toApplication(): Application {
    return {
      applicationId: this.applicationId,
      userId: this.userId,
      jobId: this.jobId,
      status: this.status,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      documents: this.documents,
    };
  }
}
