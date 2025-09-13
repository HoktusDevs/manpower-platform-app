/**
 * Forms GraphQL Service
 * Handles all forms-related GraphQL operations
 * 
 * IMPORTANT: This service maintains exact same interface as original graphqlService
 * to ensure zero breaking changes during refactoring
 */

import { cognitoAuthService } from '../../cognitoAuthService';
import type { 
  Form, 
  FormSubmission, 
  FormsStats, 
  CreateFormInput, 
  UpdateFormInput, 
  SubmitFormInput, 
  ReviewSubmissionInput 
} from './types';

// GraphQL Operations - Extracted from original graphqlService.ts
const GET_ACTIVE_FORMS = `
  query GetActiveForms($jobId: String, $limit: Int) {
    getActiveForms(jobId: $jobId, limit: $limit) {
      formId
      title
      description
      jobId
      status
      fields {
        fieldId
        type
        label
        placeholder
        required
        options
        validation {
          minLength
          maxLength
          pattern
          minValue
          maxValue
          customMessage
        }
        order
        description
        defaultValue
      }
      createdAt
      updatedAt
      expiresAt
      isRequired
      maxSubmissions
      currentSubmissions
    }
  }
`;

const GET_FORM = `
  query GetForm($formId: String!) {
    getForm(formId: $formId) {
      formId
      title
      description
      jobId
      status
      fields {
        fieldId
        type
        label
        placeholder
        required
        options
        validation {
          minLength
          maxLength
          pattern
          minValue
          maxValue
          customMessage
        }
        order
        description
        defaultValue
      }
      createdAt
      updatedAt
      expiresAt
      isRequired
      maxSubmissions
      currentSubmissions
    }
  }
`;

const GET_ALL_FORMS = `
  query GetAllForms($status: FormStatus, $jobId: String, $limit: Int) {
    getAllForms(status: $status, jobId: $jobId, limit: $limit) {
      formId
      title
      description
      jobId
      status
      fields {
        fieldId
        type
        label
        placeholder
        required
        options
        validation {
          minLength
          maxLength
          pattern
          minValue
          maxValue
          customMessage
        }
        order
        description
        defaultValue
      }
      createdAt
      updatedAt
      expiresAt
      isRequired
      maxSubmissions
      currentSubmissions
    }
  }
`;

const GET_FORM_SUBMISSIONS = `
  query GetFormSubmissions($formId: String!, $status: SubmissionStatus, $limit: Int) {
    getFormSubmissions(formId: $formId, status: $status, limit: $limit) {
      submissionId
      formId
      applicantId
      responses {
        fieldId
        value
        fieldType
      }
      submittedAt
      status
      reviewedBy
      reviewedAt
      reviewNotes
      score
    }
  }
`;

const GET_MY_FORM_SUBMISSIONS = `
  query GetMyFormSubmissions($formId: String) {
    getMyFormSubmissions(formId: $formId) {
      submissionId
      formId
      applicantId
      responses {
        fieldId
        value
        fieldType
      }
      submittedAt
      status
      reviewedBy
      reviewedAt
      reviewNotes
      score
    }
  }
`;

const GET_FORMS_STATS = `
  query GetFormsStats {
    getFormsStats {
      totalForms
      activeForms
      totalSubmissions
      averageCompletionRate
      topPerformingForms {
        formId
        title
        submissionCount
        completionRate
        averageScore
      }
    }
  }
`;

const CREATE_FORM = `
  mutation CreateForm($input: CreateFormInput!) {
    createForm(input: $input) {
      formId
      title
      description
      jobId
      status
      fields {
        fieldId
        type
        label
        placeholder
        required
        options
        validation {
          minLength
          maxLength
          pattern
          minValue
          maxValue
          customMessage
        }
        order
        description
        defaultValue
      }
      createdAt
      updatedAt
      expiresAt
      isRequired
      maxSubmissions
      currentSubmissions
    }
  }
`;

const UPDATE_FORM = `
  mutation UpdateForm($input: UpdateFormInput!) {
    updateForm(input: $input) {
      formId
      title
      description
      jobId
      status
      fields {
        fieldId
        type
        label
        placeholder
        required
        options
        validation {
          minLength
          maxLength
          pattern
          minValue
          maxValue
          customMessage
        }
        order
        description
        defaultValue
      }
      createdAt
      updatedAt
      expiresAt
      isRequired
      maxSubmissions
      currentSubmissions
    }
  }
`;

const DELETE_FORM = `
  mutation DeleteForm($formId: String!) {
    deleteForm(formId: $formId)
  }
`;

const PUBLISH_FORM = `
  mutation PublishForm($formId: String!) {
    publishForm(formId: $formId) {
      formId
      status
      title
      description
    }
  }
`;

const PAUSE_FORM = `
  mutation PauseForm($formId: String!) {
    pauseForm(formId: $formId) {
      formId
      status
      title
      description
    }
  }
`;

const SUBMIT_FORM = `
  mutation SubmitForm($input: SubmitFormInput!) {
    submitForm(input: $input) {
      submissionId
      formId
      applicantId
      responses {
        fieldId
        value
        fieldType
      }
      submittedAt
      status
    }
  }
`;

const REVIEW_SUBMISSION = `
  mutation ReviewSubmission($input: ReviewSubmissionInput!) {
    reviewSubmission(input: $input) {
      submissionId
      formId
      applicantId
      status
      reviewedBy
      reviewedAt
      reviewNotes
      score
    }
  }
`;

export class FormsService {
  private executeQuery: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
  private executeMutation: <T>(mutation: string, variables?: Record<string, unknown>) => Promise<T>;

  constructor(
    executeQuery: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
    executeMutation: <T>(mutation: string, variables?: Record<string, unknown>) => Promise<T>
  ) {
    this.executeQuery = executeQuery;
    this.executeMutation = executeMutation;
  }

  /**
   * PUBLIC: Get active forms
   * Exact same implementation as original graphqlService
   */
  async getActiveForms(jobId?: string, limit?: number): Promise<Form[]> {
    const result = await this.executeQuery<{ getActiveForms: Form[] }>(
      GET_ACTIVE_FORMS,
      { jobId, limit }
    );
    return result.getActiveForms;
  }

  /**
   * PUBLIC: Get specific form
   * Exact same implementation as original graphqlService
   */
  async getForm(formId: string): Promise<Form | null> {
    const result = await this.executeQuery<{ getForm: Form | null }>(
      GET_FORM,
      { formId }
    );
    return result.getForm;
  }

  /**
   * ADMIN ONLY: Get all forms
   * Exact same implementation as original graphqlService
   */
  async getAllForms(status?: string, jobId?: string, limit?: number): Promise<Form[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access all forms');
    }

    try {
      const result = await this.executeQuery<{ getAllForms: Form[] | null }>(
        GET_ALL_FORMS,
        { status, jobId, limit }
      );
      return result.getAllForms || [];
    } catch (error) {
      // Re-throw authentication errors to trigger auto-logout
      if (error instanceof Error && 
          (error.message.includes('No valid authentication token') || 
           error.message.includes('Authorization failed'))) {
        throw error;
      }
      return [];
    }
  }

  /**
   * ADMIN ONLY: Get form submissions
   * Exact same implementation as original graphqlService
   */
  async getFormSubmissions(formId: string, status?: string, limit?: number): Promise<FormSubmission[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access form submissions');
    }

    const result = await this.executeQuery<{ getFormSubmissions: FormSubmission[] }>(
      GET_FORM_SUBMISSIONS,
      { formId, status, limit }
    );
    return result.getFormSubmissions;
  }

  /**
   * POSTULANTE: Get my form submissions
   * Exact same implementation as original graphqlService
   */
  async getMyFormSubmissions(formId?: string): Promise<FormSubmission[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can access their form submissions');
    }

    const result = await this.executeQuery<{ getMyFormSubmissions: FormSubmission[] }>(
      GET_MY_FORM_SUBMISSIONS,
      { formId }
    );
    return result.getMyFormSubmissions;
  }

  /**
   * ADMIN ONLY: Get forms statistics
   * Exact same implementation as original graphqlService
   */
  async getFormsStats(): Promise<FormsStats> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access forms statistics');
    }

    const result = await this.executeQuery<{ getFormsStats: FormsStats }>(GET_FORMS_STATS);
    return result.getFormsStats;
  }

  /**
   * ADMIN ONLY: Create form
   * Exact same implementation as original graphqlService
   */
  async createForm(input: CreateFormInput): Promise<Form> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can create forms');
    }

    const result = await this.executeMutation<{ createForm: Form }>(
      CREATE_FORM,
      { input }
    );
    return result.createForm;
  }

  /**
   * ADMIN ONLY: Update form
   * Exact same implementation as original graphqlService
   */
  async updateForm(input: UpdateFormInput): Promise<Form> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can update forms');
    }

    const result = await this.executeMutation<{ updateForm: Form }>(
      UPDATE_FORM,
      { input }
    );
    return result.updateForm;
  }

  /**
   * ADMIN ONLY: Delete form
   * Exact same implementation as original graphqlService
   */
  async deleteForm(formId: string): Promise<boolean> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can delete forms');
    }

    const result = await this.executeMutation<{ deleteForm: boolean }>(
      DELETE_FORM,
      { formId }
    );
    return result.deleteForm;
  }

  /**
   * ADMIN ONLY: Publish form
   * Exact same implementation as original graphqlService
   */
  async publishForm(formId: string): Promise<Form> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can publish forms');
    }

    const result = await this.executeMutation<{ publishForm: Form }>(
      PUBLISH_FORM,
      { formId }
    );
    return result.publishForm;
  }

  /**
   * ADMIN ONLY: Pause form
   * Exact same implementation as original graphqlService
   */
  async pauseForm(formId: string): Promise<Form> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can pause forms');
    }

    const result = await this.executeMutation<{ pauseForm: Form }>(
      PAUSE_FORM,
      { formId }
    );
    return result.pauseForm;
  }

  /**
   * POSTULANTE: Submit form response
   * Exact same implementation as original graphqlService
   */
  async submitForm(input: SubmitFormInput): Promise<FormSubmission> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can submit forms');
    }

    const result = await this.executeMutation<{ submitForm: FormSubmission }>(
      SUBMIT_FORM,
      { input }
    );
    return result.submitForm;
  }

  /**
   * ADMIN ONLY: Review form submission
   * Exact same implementation as original graphqlService
   */
  async reviewSubmission(input: ReviewSubmissionInput): Promise<FormSubmission> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can review form submissions');
    }

    const result = await this.executeMutation<{ reviewSubmission: FormSubmission }>(
      REVIEW_SUBMISSION,
      { input }
    );
    return result.reviewSubmission;
  }
}