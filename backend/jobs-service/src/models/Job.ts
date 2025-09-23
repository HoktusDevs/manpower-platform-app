export interface Job {
  jobId: string;
  title: string;
  description: string;
  companyName: string;
  companyId?: string;
  location: string;
  salary?: string;
  employmentType: string;
  experienceLevel: string;
  requirements?: string;
  benefits?: string;
  schedule?: string;
  expiresAt?: string;
  folderId: string;        // Carpeta destino donde se creará
  jobFolderId?: string;    // Carpeta específica auto-creada para este job
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;       // Admin que creó el job
  requiredDocuments?: string[];  // Documentos necesarios para el empleo
}

export class JobModel {
  public jobId: string;
  public title: string;
  public description: string;
  public companyName: string;
  public companyId?: string;
  public location: string;
  public salary?: string;
  public employmentType: string;
  public experienceLevel: string;
  public requirements?: string;
  public benefits?: string;
  public schedule?: string;
  public expiresAt?: string;
  public folderId: string;
  public jobFolderId?: string;
  public status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
  public isActive: boolean;
  public createdAt: string;
  public updatedAt: string;
  public createdBy: string;
  public requiredDocuments?: string[];

  constructor(data: Partial<Job>) {
    this.jobId = data.jobId || '';
    this.title = data.title || '';
    this.description = data.description || '';
    this.companyName = data.companyName || '';
    this.companyId = data.companyId;
    this.location = data.location || '';
    this.salary = data.salary;
    this.employmentType = data.employmentType || 'full-time';
    this.experienceLevel = data.experienceLevel || 'mid';
    this.requirements = data.requirements;
    this.benefits = data.benefits;
    this.schedule = data.schedule;
    this.expiresAt = data.expiresAt;
    this.folderId = data.folderId || '';
    this.jobFolderId = data.jobFolderId;
    this.status = data.status || 'DRAFT';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.createdBy = data.createdBy || '';
    this.requiredDocuments = data.requiredDocuments;
  }

  // Validate job data
  public isValid(): boolean {
    const hasRequiredFields = !!(
      this.title &&
      this.description &&
      this.companyName &&
      this.location &&
      this.folderId &&
      this.createdBy
    );

    // Validate employment type if provided
    const validEmploymentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'TEMPORARY'];
    const hasValidEmploymentType = !this.employmentType || validEmploymentTypes.includes(this.employmentType);

    // Validate experience level if provided
    const validExperienceLevels = ['ENTRY_LEVEL', 'MID_LEVEL', 'SENIOR_LEVEL', 'EXECUTIVE', 'INTERNSHIP'];
    const hasValidExperienceLevel = !this.experienceLevel || validExperienceLevels.includes(this.experienceLevel);

    // Validate status if provided
    const validStatuses = ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED'];
    const hasValidStatus = !this.status || validStatuses.includes(this.status);

    // Validate requiredDocuments if provided
    const hasValidRequiredDocuments = !this.requiredDocuments || Array.isArray(this.requiredDocuments);

    return hasRequiredFields && hasValidEmploymentType && hasValidExperienceLevel && hasValidStatus && hasValidRequiredDocuments;
  }

  // Check if job is visible to postulantes
  public isPubliclyVisible(): boolean {
    return this.status === 'PUBLISHED' && this.isActive;
  }

  // Generate folder name for this job
  public generateJobFolderName(): string {
    // Include location in folder name for better hierarchy
    return `${this.title} - ${this.companyName} - ${this.location}`;
  }

  // Update status with validation
  public updateStatus(newStatus: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED'): void {
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['PUBLISHED'],
      'PUBLISHED': ['PAUSED', 'CLOSED'],
      'PAUSED': ['PUBLISHED', 'CLOSED'],
      'CLOSED': [] // No transitions from closed
    };

    if (validTransitions[this.status]?.includes(newStatus)) {
      this.status = newStatus;
      this.updateTimestamp();
    } else {
      throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
    }
  }

  public toJSON(): Job {
    return {
      jobId: this.jobId,
      title: this.title,
      description: this.description,
      companyName: this.companyName,
      companyId: this.companyId,
      location: this.location,
      salary: this.salary,
      employmentType: this.employmentType,
      experienceLevel: this.experienceLevel,
      requirements: this.requirements,
      benefits: this.benefits,
      schedule: this.schedule,
      expiresAt: this.expiresAt,
      folderId: this.folderId,
      jobFolderId: this.jobFolderId,
      status: this.status,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      requiredDocuments: this.requiredDocuments
    };
  }

  public updateTimestamp(): void {
    this.updatedAt = new Date().toISOString();
  }
}