import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError, apiClient, onUnauthorized, setAuthToken } from './client';

jest.mock('@/utils/storage', () => {
  const store = new Map<string, string>();
  return {
    storage: {
      getItem: jest.fn(async (key: string) => store.get(key) || null),
      setItem: jest.fn(async (key: string, val: string) => {
        store.set(key, val);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
    },
  };
});

describe('apiClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('successfully executes request and parses JSON response', async () => {
    globalThis.fetch = (jest.fn() as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 1, name: 'Apollo Patient' }),
      text: async () => JSON.stringify({ id: 1, name: 'Apollo Patient' }),
    } as Response);

    const result = await apiClient<{ id: number; name: string }>('/api/v1/patient/profile');

    expect(result).toEqual({ id: 1, name: 'Apollo Patient' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/patient/profile'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      })
    );
  });

  it('attaches query parameters correctly', async () => {
    globalThis.fetch = (jest.fn() as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
      text: async () => JSON.stringify({ success: true }),
    } as Response);

    await apiClient('/api/v1/search', {
      params: { query: 'hypertension', limit: 10, empty: null, missing: undefined },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/search\?query=hypertension&limit=10$/),
      expect.anything()
    );
  });

  it('injects Authorization Bearer token when present', async () => {
    await setAuthToken('test-jwt-token-123');

    globalThis.fetch = (jest.fn() as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: 'secure' }),
      text: async () => JSON.stringify({ data: 'secure' }),
    } as Response);

    await apiClient('/api/v1/secure-data');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/secure-data'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt-token-123',
        }),
      })
    );
  });

  it('notifies unauthorized listeners on HTTP 401 response', async () => {
    const unauthorizedSpy = jest.fn();
    const unsubscribe = onUnauthorized(unauthorizedSpy);

    globalThis.fetch = (jest.fn() as any).mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Token expired' }),
      text: async () => JSON.stringify({ message: 'Token expired' }),
    } as Response);

    await expect(apiClient('/api/v1/auth/me')).rejects.toThrow(ApiError);
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('aborts and throws status 408 when request exceeds timeoutMs', async () => {
    globalThis.fetch = (jest.fn() as any).mockImplementation((_url: any, init?: RequestInit) => {
      return new Promise((_, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    await expect(apiClient('/api/v1/slow-endpoint', { timeoutMs: 50 })).rejects.toMatchObject({
      name: 'ApiError',
      status: 408,
      message: expect.stringContaining('Request timed out'),
    });
  });

  it('converts TypeError "Failed to fetch" into informative network/CORS error', async () => {
    globalThis.fetch = (jest.fn() as any).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiClient('/api/v1/auth/login')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: expect.stringContaining('Unable to connect to the Apollo server. Please check your network or server CORS configuration.'),
    });
  });

  it('converts TypeError "Network request failed" (mobile) into informative error', async () => {
    globalThis.fetch = (jest.fn() as any).mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiClient('/api/v1/auth/login')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: expect.stringContaining('Unable to connect to the Apollo server'),
    });
  });

  it('throws custom ApiError for server 4xx/5xx responses with message from body', async () => {
    globalThis.fetch = (jest.fn() as any).mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Patient not found' }),
      text: async () => JSON.stringify({ message: 'Patient not found' }),
    } as Response);

    await expect(apiClient('/api/v1/patient/999')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Patient not found',
    });
  });
});
