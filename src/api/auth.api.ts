import { apiClient, setAuthToken, removeAuthToken } from './client';
import { components } from './types';

export type AuthResponse = components['schemas']['AuthResponse'];
export type LoginRequest = components['schemas']['LoginRequest'];
export type RegisterPatientRequest = components['schemas']['RegisterPatientRequest'];
export type CurrentUserResponse = components['schemas']['CurrentUserResponse'];

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const data = await apiClient<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: credentials,
    });
    if (data.token) {
      await setAuthToken(data.token);
    }
    return data;
  },

  async registerPatient(request: RegisterPatientRequest): Promise<AuthResponse> {
    const data = await apiClient<AuthResponse>('/api/v1/auth/register/patient', {
      method: 'POST',
      body: request,
    });
    if (data.token) {
      await setAuthToken(data.token);
    }
    return data;
  },

  async getMe(): Promise<CurrentUserResponse> {
    return apiClient<CurrentUserResponse>('/api/v1/auth/me', {
      method: 'GET',
    });
  },

  async logout(): Promise<void> {
    await removeAuthToken();
  },
};
