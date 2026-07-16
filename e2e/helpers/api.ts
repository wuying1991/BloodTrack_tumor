import { expect } from '@playwright/test';

/**
 * API helpers for E2E setup - register users, seed data via the HTTP API so tests
 * don't have to drive every action through the UI. Run against the same /api the app
 * uses (nginx proxy -> backend), configurable via E2E_API_URL.
 */
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
}

export interface BloodTestInput {
  date: string;
  wbc: number;
  rbc: number;
  hgb: number;
  plt: number;
  neu?: number;
  notes?: string;
}

export interface ShareInput {
  scope?: { bloodTests: boolean; chemoCycles: boolean; analytics: boolean };
  expiresIn?: '1d' | '7d' | '30d' | '90d' | 'never';
  pin?: string;
}

let counter = 0;
export function uniqueEmail(prefix = 'e2e'): string {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}@test.com`;
}

async function apiPost(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function apiPut(path: string, body: unknown, token: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

/** Enable data sharing (master switch) via API - required before createShare (else 403). */
export async function enableDataSharing(token: string) {
  const { status, json } = await apiPut('/auth/settings', { dataSharing: { enabled: true } }, token);
  expect(status, `enableDataSharing failed: ${JSON.stringify(json)}`).toBe(200);
  return json.data;
}

/** Register a user via API and return tokens + the full profile (what AuthContext stores). */
export async function registerUser(opts?: {
  fullName?: string;
  email?: string;
  password?: string;
}): Promise<AuthTokens> {
  const email = opts?.email ?? uniqueEmail();
  const fullName = opts?.fullName ?? 'E2E用户';
  const password = opts?.password ?? 'Test1234';
  const { status, json } = await apiPost('/auth/register', { fullName, email, password });
  expect(status, `register failed: ${JSON.stringify(json)}`).toBe(201);
  const { accessToken, refreshToken } = json.data;

  const profRes = await fetch(`${API_URL}/auth/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const prof = await profRes.json();
  return { accessToken, refreshToken, user: prof.data };
}

/** Create a blood test via API (used to seed data for edit/delete/list assertions). */
export async function createBloodTest(token: string, data: BloodTestInput) {
  const { status, json } = await apiPost('/blood-tests', data, token);
  expect(status, `createBloodTest failed: ${JSON.stringify(json)}`).toBe(201);
  return json.data;
}

/** Create a share link via API. Returns { token, shareUrl, ... } (token shown once). */
export async function createShare(token: string, opts?: ShareInput) {
  const { status, json } = await apiPost(
    '/shares',
    {
      scope: opts?.scope ?? { bloodTests: true, chemoCycles: false, analytics: false },
      expiresIn: opts?.expiresIn ?? 'never',
      ...(opts?.pin ? { pin: opts.pin } : {}),
    },
    token
  );
  expect(status, `createShare failed: ${JSON.stringify(json)}`).toBe(201);
  return json.data;
}
