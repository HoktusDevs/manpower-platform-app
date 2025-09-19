import type { CreateFormFieldInput } from '../services/graphqlService';

export interface FieldTemplate {
  id: string;
  name: string;
  description: string;
  category: 'personal' | 'professional' | 'evaluation' | 'documents' | 'custom';
  field: Omit<CreateFormFieldInput, 'order'>;
}

export interface FieldTemplateCategory {
  id: string;
  name: string;
  description: string;
  templates: FieldTemplate[];
}

export const FIELD_TEMPLATES: FieldTemplateCategory[] = [
  {
    id: 'personal',
    name: 'Información Personal',
    description: 'Datos personales básicos del postulante',
    templates: [
      {
        id: 'fullName',
        name: 'Nombre Completo',
        description: 'Nombre y apellidos del postulante',
        category: 'personal',
        field: {
          type: 'TEXT',
          label: 'Nombre Completo',
          placeholder: 'Ingresa tu nombre completo',
          required: true,
          validation: {
            minLength: 3,
            maxLength: 100,
            customMessage: 'El nombre debe tener entre 3 y 100 caracteres'
          },
          description: 'Nombre y apellidos completos como aparecen en tu documento de identidad'
        }
      },
      {
        id: 'email',
        name: 'Email',
        description: 'Correo electrónico de contacto',
        category: 'personal',
        field: {
          type: 'EMAIL',
          label: 'Correo Electrónico',
          placeholder: 'ejemplo@correo.com',
          required: true,
          validation: {
            customMessage: 'Ingresa un correo electrónico válido'
          },
          description: 'Correo donde recibirás notificaciones sobre tu postulación'
        }
      },
      {
        id: 'phone',
        name: 'Teléfono',
        description: 'Número de contacto telefónico',
        category: 'personal',
        field: {
          type: 'PHONE',
          label: 'Número de Teléfono',
          placeholder: '+1 234 567 8900',
          required: true,
          validation: {
            pattern: '^[+]?[0-9]{10,15}$',
            customMessage: 'Ingresa un número de teléfono válido'
          },
          description: 'Número donde podamos contactarte'
        }
      },
      {
        id: 'birthDate',
        name: 'Fecha de Nacimiento',
        description: 'Fecha de nacimiento del postulante',
        category: 'personal',
        field: {
          type: 'DATE',
          label: 'Fecha de Nacimiento',
          required: false,
          description: 'Tu fecha de nacimiento (opcional)'
        }
      },
      {
        id: 'idDocument',
        name: 'Documento de Identidad',
        description: 'Número de cédula o pasaporte',
        category: 'personal',
        field: {
          type: 'TEXT',
          label: 'Documento de Identidad',
          placeholder: 'Número de cédula o pasaporte',
          required: true,
          validation: {
            minLength: 6,
            maxLength: 20,
            customMessage: 'Documento debe tener entre 6 y 20 caracteres'
          },
          description: 'Cédula de identidad o número de pasaporte'
        }
      }
    ]
  },
  {
    id: 'professional',
    name: 'Información Profesional',
    description: 'Experiencia laboral y formación académica',
    templates: [
      {
        id: 'workExperience',
        name: 'Experiencia Laboral',
        description: 'Describe tu experiencia profesional',
        category: 'professional',
        field: {
          type: 'TEXTAREA',
          label: 'Experiencia Laboral',
          placeholder: 'Describe tu experiencia profesional, cargos anteriores, responsabilidades...',
          required: true,
          validation: {
            minLength: 50,
            maxLength: 1000,
            customMessage: 'Describe tu experiencia en al menos 50 caracteres'
          },
          description: 'Detalla tu experiencia profesional relevante para este puesto'
        }
      },
      {
        id: 'educationLevel',
        name: 'Nivel de Educación',
        description: 'Máximo nivel educativo alcanzado',
        category: 'professional',
        field: {
          type: 'SELECT',
          label: 'Nivel de Educación',
          required: true,
          options: [
            'Educación Secundaria',
            'Técnico/Tecnológico',
            'Universitario - Pregrado',
            'Universitario - Postgrado',
            'Maestría',
            'Doctorado'
          ],
          description: 'Selecciona tu máximo nivel educativo completado'
        }
      },
      {
        id: 'experienceArea',
        name: 'Área de Experiencia',
        description: 'Sector o área de experiencia principal',
        category: 'professional',
        field: {
          type: 'SELECT',
          label: 'Área de Experiencia',
          required: true,
          options: [
            'Administración y Finanzas',
            'Ventas y Marketing',
            'Recursos Humanos',
            'Tecnología e IT',
            'Producción y Manufactura',
            'Logística y Distribución',
            'Servicio al Cliente',
            'Ingeniería',
            'Salud y Medicina',
            'Educación',
            'Construcción',
            'Turismo y Hotelería',
            'Otra'
          ],
          description: 'Área donde tienes mayor experiencia profesional'
        }
      },
      {
        id: 'availability',
        name: 'Disponibilidad Horaria',
        description: 'Tipo de jornada laboral disponible',
        category: 'professional',
        field: {
          type: 'RADIO',
          label: 'Disponibilidad Horaria',
          required: true,
          options: [
            'Tiempo Completo (8 horas)',
            'Medio Tiempo (4 horas)',
            'Horario Flexible',
            'Solo Fines de Semana',
            'Solo Noches'
          ],
          description: 'Selecciona tu disponibilidad de horarios'
        }
      },
      {
        id: 'skills',
        name: 'Habilidades Clave',
        description: 'Principales habilidades y competencias',
        category: 'professional',
        field: {
          type: 'TEXTAREA',
          label: 'Habilidades y Competencias',
          placeholder: 'Ej: Excel avanzado, inglés intermedio, trabajo en equipo, liderazgo...',
          required: true,
          validation: {
            minLength: 20,
            maxLength: 500,
            customMessage: 'Describe al menos 3 habilidades principales'
          },
          description: 'Lista tus habilidades más relevantes para este puesto'
        }
      }
    ]
  },
  {
    id: 'evaluation',
    name: 'Evaluación y Motivación',
    description: 'Preguntas de evaluación y motivación',
    templates: [
      {
        id: 'motivation',
        name: 'Motivación para el Puesto',
        description: '¿Por qué te interesa este trabajo?',
        category: 'evaluation',
        field: {
          type: 'TEXTAREA',
          label: '¿Por qué te interesa este puesto?',
          placeholder: 'Explica qué te motiva a postularte para esta posición...',
          required: true,
          validation: {
            minLength: 50,
            maxLength: 500,
            customMessage: 'Explica tu motivación en al menos 50 caracteres'
          },
          description: 'Cuéntanos qué te motiva a postularte para esta posición'
        }
      },
      {
        id: 'selfAssessment',
        name: 'Autoevaluación',
        description: 'Califica tu ajuste al perfil del puesto',
        category: 'evaluation',
        field: {
          type: 'RATING',
          label: '¿Qué tan bien encajas en este perfil?',
          required: true,
          validation: {
            minValue: 1,
            maxValue: 5,
            customMessage: 'Selecciona una calificación del 1 al 5'
          },
          description: 'Califica del 1 al 5 qué tan bien encajas con los requisitos del puesto'
        }
      },
      {
        id: 'salaryExpectation',
        name: 'Expectativa Salarial',
        description: 'Rango salarial esperado',
        category: 'evaluation',
        field: {
          type: 'NUMBER',
          label: 'Expectativa Salarial (mensual)',
          placeholder: 'Ej: 1500000',
          required: false,
          validation: {
            minValue: 100000,
            maxValue: 50000000,
            customMessage: 'Ingresa un valor entre $100,000 y $50,000,000'
          },
          description: 'Expectativa salarial mensual en pesos colombianos (opcional)'
        }
      },
      {
        id: 'startDate',
        name: 'Disponibilidad de Inicio',
        description: '¿Cuándo puedes empezar?',
        category: 'evaluation',
        field: {
          type: 'DATE',
          label: 'Fecha de Disponibilidad',
          required: true,
          description: '¿Cuándo podrías comenzar a trabajar?'
        }
      }
    ]
  },
  {
    id: 'documents',
    name: 'Documentos y Anexos',
    description: 'Archivos y documentos de soporte',
    templates: [
      {
        id: 'resume',
        name: 'Hoja de Vida / CV',
        description: 'Curriculum Vitae actualizado',
        category: 'documents',
        field: {
          type: 'FILE_UPLOAD',
          label: 'Hoja de Vida (CV)',
          required: true,
          description: 'Sube tu hoja de vida actualizada en formato PDF'
        }
      },
      {
        id: 'certificates',
        name: 'Certificados',
        description: 'Certificados de estudios o cursos',
        category: 'documents',
        field: {
          type: 'FILE_UPLOAD',
          label: 'Certificados',
          required: false,
          description: 'Sube certificados de estudios, cursos o capacitaciones (opcional)'
        }
      },
      {
        id: 'portfolio',
        name: 'Portfolio / Sitio Web',
        description: 'Enlace a portfolio personal',
        category: 'documents',
        field: {
          type: 'URL',
          label: 'Portfolio o Sitio Web',
          placeholder: 'https://mi-portfolio.com',
          required: false,
          validation: {
            pattern: '^https?://.+',
            customMessage: 'Ingresa una URL válida que comience con http:// o https://'
          },
          description: 'Enlace a tu portfolio, LinkedIn o sitio web profesional (opcional)'
        }
      },
      {
        id: 'references',
        name: 'Referencias Laborales',
        description: 'Contactos de referencias profesionales',
        category: 'documents',
        field: {
          type: 'TEXTAREA',
          label: 'Referencias Laborales',
          placeholder: 'Nombre: Juan Pérez\nEmpresa: ABC Corp\nCargo: Gerente\nTeléfono: 123-456-7890',
          required: false,
          validation: {
            maxLength: 500
          },
          description: 'Información de contacto de 2-3 referencias profesionales (opcional)'
        }
      }
    ]
  }
];

/**
 * Get all field templates grouped by category
 */
export function getFieldTemplatesByCategory(): FieldTemplateCategory[] {
  return FIELD_TEMPLATES;
}

/**
 * Get a specific field template by ID
 */
export function getFieldTemplateById(templateId: string): FieldTemplate | null {
  for (const category of FIELD_TEMPLATES) {
    const template = category.templates.find(t => t.id === templateId);
    if (template) return template;
  }
  return null;
}

/**
 * Create a form field from a template with auto-generated order
 */
export function createFieldFromTemplate(template: FieldTemplate, order: number): CreateFormFieldInput {
  return {
    ...template.field,
    order
  };
}

/**
 * Get quick-start form templates (common combinations)
 */
export const QUICK_START_FORMS = [
  {
    id: 'basic-job-application',
    name: 'Postulación Básica',
    description: 'Formulario básico para postulaciones de trabajo',
    fields: ['fullName', 'email', 'phone', 'workExperience', 'motivation', 'resume']
  },
  {
    id: 'detailed-application',
    name: 'Postulación Detallada',
    description: 'Formulario completo con evaluación y documentos',
    fields: ['fullName', 'email', 'phone', 'idDocument', 'workExperience', 'educationLevel', 'experienceArea', 'availability', 'motivation', 'selfAssessment', 'salaryExpectation', 'startDate', 'resume', 'certificates']
  },
  {
    id: 'technical-position',
    name: 'Puesto Técnico',
    description: 'Para posiciones que requieren habilidades técnicas',
    fields: ['fullName', 'email', 'phone', 'workExperience', 'educationLevel', 'skills', 'portfolio', 'motivation', 'resume', 'certificates']
  },
  {
    id: 'entry-level',
    name: 'Nivel de Entrada',
    description: 'Para personas sin experiencia o recién graduadas',
    fields: ['fullName', 'email', 'phone', 'educationLevel', 'skills', 'availability', 'motivation', 'startDate', 'resume']
  }
];