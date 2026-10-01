import { apiClient } from './client';
import { components } from './types';

export type AccessGrantResponse = components['schemas']['AccessGrantResponse'];
export type PrescriptionResponse = components['schemas']['PrescriptionResponse'];
export type LabTestResultResponse = components['schemas']['LabTestResultResponse'];
export type HealthConditionResponse = components['schemas']['HealthConditionResponse'];
export type CreateHealthConditionRequest = components['schemas']['CreateHealthConditionRequest'];
export type UpdatePatientProfileRequest = components['schemas']['UpdatePatientProfileRequest'];
export type PatientProfileResponse = components['schemas']['PatientProfileResponse'];
export type BaselineConditionItem = components['schemas']['BaselineConditionItem'];
export type SyncBaselineConditionsRequest = components['schemas']['SyncBaselineConditionsRequest'];
export type PatientVaultTimelineResponse = components['schemas']['PatientVaultTimelineResponse'];
// Note: the timeline's `encounters` array is typed as ClinicalEncounterSummaryDto,
// not ClinicalEncounterResponse (a separate, fuller schema used elsewhere) —
// see LOCAL_BRIDGE_NOTES.md.
export type ClinicalEncounterSummaryDto = components['schemas']['ClinicalEncounterSummaryDto'];

export const vaultApi = {
  /**
   * Updates patient baseline biometrics and profile attributes (gender, height, weight, bloodType).
   */
  async updateProfile(data: UpdatePatientProfileRequest): Promise<PatientProfileResponse> {
    return apiClient<PatientProfileResponse>('/api/v1/patient/profile', {
      method: 'PATCH',
      body: data,
    });
  },

  /**
   * Retrieves patient profile including baseline attributes.
   */
  async getProfile(): Promise<PatientProfileResponse> {
    return apiClient<PatientProfileResponse>('/api/v1/patient/profile', {
      method: 'GET',
    });
  },

  /**
   * Generates a 6-digit access PIN valid for 15 minutes to unlock doctor consultation.
   */
  async generateAccessGrant(): Promise<AccessGrantResponse> {
    return apiClient<AccessGrantResponse>('/api/v1/patient/vault/access-grants', {
      method: 'POST',
    });
  },

  /**
   * Retrieves patient prescriptions, optionally filtered by status (ACTIVE, FULFILLED, CANCELLED).
   */
  async getPrescriptions(status?: 'ACTIVE' | 'FULFILLED' | 'CANCELLED'): Promise<PrescriptionResponse[]> {
    return apiClient<PrescriptionResponse[]>('/api/v1/patient/vault/prescriptions', {
      method: 'GET',
      params: status ? { status } : undefined,
    });
  },

  /** Marks a patient-owned prescription as fulfilled. */
  async updatePrescriptionStatus(
    prescriptionId: string,
    status: 'ACTIVE' | 'FULFILLED' | 'CANCELLED'
  ): Promise<PrescriptionResponse> {
    return apiClient<PrescriptionResponse>(`/api/v1/prescriptions/${encodeURIComponent(prescriptionId)}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },

  /**
   * Retrieves time-series lab test results sorted chronologically ascending.
   */
  async getTestResults(testName?: string): Promise<LabTestResultResponse[]> {
    return apiClient<LabTestResultResponse[]>('/api/v1/patient/vault/test-results', {
      method: 'GET',
      params: testName ? { testName } : undefined,
    });
  },

  /**
   * Retrieves the consolidated chronological vault view (profile + conditions +
   * clinical encounters). Previously unused by this app — Home used to fake its
   * timeline from getConditions() alone, which is why doctor visits never
   * showed up anywhere. Now the source of truth for both Home's timeline and
   * the Vault's Visits tab.
   */
  async getTimeline(): Promise<PatientVaultTimelineResponse> {
    return apiClient<PatientVaultTimelineResponse>('/api/v1/patient/vault/timeline', {
      method: 'GET',
    });
  },

  /**
   * Retrieves patient-declared and doctor-verified health conditions/allergies.
   */
  async getConditions(): Promise<HealthConditionResponse[]> {
    return apiClient<HealthConditionResponse[]>('/api/v1/patient/vault/conditions', {
      method: 'GET',
    });
  },

  /**
   * Adds a baseline health condition.
   */
  async addCondition(request: CreateHealthConditionRequest): Promise<HealthConditionResponse> {
    return apiClient<HealthConditionResponse>('/api/v1/patient/vault/conditions', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Batch synchronizes patient-declared baseline conditions, atomically replacing previous patient entries.
   */
  async syncBaselineConditions(
    conditionsOrRequest:
      | Array<{ title: string; type: 'ALLERGY' | 'CHRONIC_CONDITION' | 'LIFESTYLE' | string; notes?: string }>
      | SyncBaselineConditionsRequest
  ): Promise<HealthConditionResponse[]> {
    const body: SyncBaselineConditionsRequest = Array.isArray(conditionsOrRequest)
      ? { conditions: conditionsOrRequest as BaselineConditionItem[] }
      : conditionsOrRequest;

    return apiClient<HealthConditionResponse[]>('/api/v1/patient/vault/conditions/baseline', {
      method: 'PUT',
      body,
    });
  },

  /**
   * Deletes a patient-declared condition.
   */
  async deleteCondition(conditionId: string): Promise<void> {
    await apiClient<void>(`/api/v1/patient/vault/conditions/${conditionId}`, {
      method: 'DELETE',
    });
  },
};
