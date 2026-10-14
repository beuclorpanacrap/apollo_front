import { storage } from '@/utils/storage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://apollo-backend-ouuq.onrender.com';

const TOKEN_KEY = 'apollo_auth_token';

export async function getAuthToken(): Promise<string | null> {
  return storage.getItem(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await storage.setItem(TOKEN_KEY, token);
}

export async function removeAuthToken(): Promise<void> {
  await storage.removeItem(TOKEN_KEY);
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized() {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('[apiClient] error in unauthorized listener:', e);
    }
  });
}

export const DEFAULT_TIMEOUT_MS = 25000;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    body,
    params,
    headers: customHeaders,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: customSignal,
    ...customOptions
  } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        query.append(key, String(val));
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (customSignal) {
    if (customSignal.aborted) {
      controller.abort();
    } else {
      customSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...customOptions,
      signal: controller.signal,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      // Token may be invalid or expired
      await removeAuthToken();
      notifyUnauthorized();
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage =
        (typeof data === 'object' && data !== null && (data.message || data.error)) ||
        `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (timedOut || error.name === 'AbortError') {
      if (timedOut) {
        throw new ApiError('Request timed out. The server may be waking up, please try again.', 408);
      }
      throw new ApiError('Request was aborted.', 499);
    }
    if (
      error instanceof TypeError &&
      (error.message.includes('Failed to fetch') ||
        error.message.includes('Network request failed') ||
        error.message.includes('NetworkError'))
    ) {
      throw new ApiError(
        'Unable to connect to the Apollo server. Please check your network or server CORS configuration.',
        0
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
