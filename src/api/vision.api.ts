import { apiClient } from './client';
import type { CreateVisionPrescriptionRequest, VisionPrescriptionResponse } from './vision.types';

export type {
  CreateVisionPrescriptionRequest,
  VisionEyeValues,
  VisionPrescriptionResponse,
} from './vision.types';

export const visionApi = {
  /** Clinician: issue a glasses prescription for the patient whose vault is unlocked. */
  async create(body: CreateVisionPrescriptionRequest): Promise<VisionPrescriptionResponse> {
    return apiClient<VisionPrescriptionResponse>('/api/v1/doctor/vision-prescriptions', {
      method: 'POST',
      body,
    });
  },

  /** Patient: glasses prescriptions issued to the signed-in patient, newest first. */
  async list(): Promise<VisionPrescriptionResponse[]> {
    return apiClient<VisionPrescriptionResponse[]>('/api/v1/patient/vault/vision-prescriptions', {
      method: 'GET',
    });
  },
};
