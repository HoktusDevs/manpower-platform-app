export interface JobPosting {
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
  requiredDocuments?: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Application {
  applicationId: string;
  userId: string;
  jobId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'APPROVED' | 'INTERVIEW_SCHEDULED' | 'HIRED';
  description?: string;
  createdAt: string;
  updatedAt: string;
  documents?: string[];
  applicantFolderId?: string; // ID of the applicant's folder in folders-service
  // Enriched fields from job
  jobTitle?: string;
  title?: string; // alias for jobTitle
  companyName?: string;
  position?: string; // alias for jobTitle
  location?: string;
  salary?: string;
  employmentType?: string;
  experienceLevel?: string;
  requirements?: string;
  benefits?: string[];
  skills?: string[];
  companyId?: string;
}

export interface User {
  sub: string;
  email: string;
  fullName?: string | undefined;
  role?: string | undefined;
  given_name?: string | undefined;
  family_name?: string | undefined;
}

export interface UserApplicationData {
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  educacion: string;
}

export interface UserProfileData {
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  fechaNacimiento: string;
  educacionNivel: string;
  experienciaLaboral: string;
  habilidades: string;
}

export type TabType = 'puestos' | 'informacion' | 'documentos';