import { User } from '../types/index.ts';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('salonix_auth_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('salonix_auth_token', token);
    } else {
      localStorage.removeItem('salonix_auth_token');
    }
  } catch {
    // ignore local storage restrictions
  }
}

/**
 * Centralized authenticated fetch helper.
 * Automatically attaches Authorization: Bearer <token> if available.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
