import { z } from 'zod';

// Job Posting Basic Information Schema
export const jobPostingBasicSchema = z.object({
  title: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(100, 'El título no debe exceder 100 caracteres')
    .nonempty('El título del empleo es requerido'),
  
  companyName: z
    .string()
    .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres')
    .max(100, 'El nombre de la empresa no debe exceder 100 caracteres')
    .nonempty('El nombre de la empresa es requerido'),
  
  description: z
    .string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(2000, 'La descripción no debe exceder 2000 caracteres')
    .nonempty('La descripción es requerida'),
  
  requirements: z
    .string()
    .min(10, 'Los requisitos deben tener al menos 10 caracteres')
    .max(1000, 'Los requisitos no deben exceder 1000 caracteres')
    .nonempty('Los requisitos son requeridos'),
});

// Employment Type Schema
export const employmentTypeSchema = z.enum([
  'FULL_TIME',
  'PART_TIME', 
  'CONTRACT',
  'FREELANCE',
  'INTERNSHIP',
  'TEMPORARY'
]);

// Experience Level Schema
export const experienceLevelSchema = z.enum([
  'ENTRY_LEVEL',
  'MID_LEVEL',
  'SENIOR_LEVEL', 
  'EXECUTIVE',
  'INTERNSHIP'
]);

// Additional Fields Schema
export const additionalFieldsSchema = z.object({
  location: z
    .string()
    .min(2, 'La ubicación debe tener al menos 2 caracteres')
    .optional(),
  
  employmentType: employmentTypeSchema.optional(),
  
  experienceLevel: experienceLevelSchema.optional(),
  
  salary: z
    .string()
    .refine(
      (val) => val === '' || /^\$?[\d,]+(\.?[\d]+)?(\s*-\s*\$?[\d,]+(\.?[\d]+)?)?\s*(MXN|USD|EUR|pesos?|dollars?)?$/i.test(val),
      'Formato de salario inválido. Ej: $50,000 - $80,000 MXN'
    )
    .optional(),
  
  benefits: z
    .string()
    .max(500, 'Los beneficios no deben exceder 500 caracteres')
    .optional(),
  
  expiresAt: z
    .string()
    .optional()
});

// Field Values Schema (for dynamic fields)
export const fieldValuesSchema = z.record(z.string(), z.unknown()).optional();

// Complete Job Posting Schema
export const completeJobPostingSchema = jobPostingBasicSchema.merge(
  additionalFieldsSchema
).extend({
  fieldValues: fieldValuesSchema,
  selectedFormId: z.string().nullable().optional(),
});

// Types inferred from schemas
export type JobPostingBasic = z.infer<typeof jobPostingBasicSchema>;
export type AdditionalFields = z.infer<typeof additionalFieldsSchema>;
export type CompleteJobPosting = z.infer<typeof completeJobPostingSchema>;
export type EmploymentType = z.infer<typeof employmentTypeSchema>;
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;

// Validation helper functions
export const validateJobPostingBasic = (data: unknown) => {
  return jobPostingBasicSchema.safeParse(data);
};

export const validateCompleteJobPosting = (data: unknown) => {
  return completeJobPostingSchema.safeParse(data);
};

// Error formatting helper
export const formatZodErrors = (zodError: z.ZodError) => {
  const formattedErrors: Record<string, string> = {};
  
  zodError.issues.forEach((issue) => {
    const path = issue.path.join('.');
    formattedErrors[path] = issue.message;
  });
  
  return formattedErrors;
};