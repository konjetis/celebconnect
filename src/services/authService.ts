/**
 * Auth Service
 *
 * Connects to the CelebConnect backend for all authentication operations.
 * Set EXPO_PUBLIC_BACKEND_URL in your .env file to point at your backend.
 *
 * Example .env:
 *   EXPO_PUBLIC_BACKEND_URL=https://your-railway-backend.up.railway.app
 */

import { LoginCredentials, RegisterCredentials, User } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

class AuthError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit
): Promise<T> {
  if (!BASE_URL) {
    throw new AuthError(
      'Backend not configured. Set EXPO_PUBLIC_BACKEND_URL in your .env file.'
    );
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AuthError(
      data?.message ?? data?.error ?? `Request failed (${response.status})`,
      response.status
    );
  }

  return data as T;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Sign in with email/phone + password.
 * Returns the user object and a JWT token.
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * Create a new account.
 * Returns the newly created user and a JWT token.
 */
export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * Request a password reset email/SMS for the given identifier.
 */
export async function forgotPassword(identifier: string): Promise<void> {
  await request<void>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });
}

/**
 * Validate the current session token.
 * Returns the current user, or throws if the token is invalid/expired.
 */
export async function validateToken(token: string): Promise<User> {
  return request<User>('/api/auth/me', {
    method: 'GET',
    headers: authHeaders(token),
  });
}

/**
 * Update the user's profile information.
 */
export async function updateProfile(token: string, updates: Partial<User>): Promise<User> {
  return request<User>('/api/auth/profile', {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(updates),
  });
}

/**
 * Upload a profile photo and return the hosted URL.
 */
export async function uploadProfilePhoto(token: string, localUri: string): Promise<string> {
  if (!BASE_URL) {
    // Return local URI as fallback when backend not configured
    return localUri;
  }

  const formData = new FormData();
  formData.append('photo', {
    uri: localUri,
    name: 'profile.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const response = await fetch(`${BASE_URL}/api/auth/profile-photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    throw new AuthError('Failed to upload profile photo', response.status);
  }

  const data = await response.json();
  return data.url as string;
}
