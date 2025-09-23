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
  userId: string;
  applicationId: string;
  jobId: string;
  companyName: string;
  position: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW' | 'INTERVIEW_SCHEDULED' | 'HIRED';
  description?: string | undefined;
  salary?: string | undefined;
  location?: string | undefined;
  createdAt: string;
  updatedAt: string;
  companyId?: string | undefined;
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