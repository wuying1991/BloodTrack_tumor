import { http } from '@/api/http';
import type {
  AuthSession,
  AuthUser,
  IdentitySnapshot,
  LoginCredentials,
  RegisterData,
  SmsLoginPayload,
  SmsSendResult,
  TokenPair,
} from '@/types/auth';
import type { ApiSuccess } from '@/types/api';

export async function login(
  credentials: LoginCredentials
): Promise<AuthSession> {
  const res = await http.post<ApiSuccess<AuthSession>>(
    '/auth/login',
    credentials,
    true
  );
  return res.data;
}

export async function register(payload: RegisterData): Promise<AuthSession> {
  const res = await http.post<ApiSuccess<AuthSession>>(
    '/auth/register',
    payload,
    true
  );
  return res.data;
}

export async function sendSmsCode(
  phone: string,
  purpose: 'login' | 'bind' = 'login'
): Promise<SmsSendResult> {
  const res = await http.post<ApiSuccess<SmsSendResult>>(
    '/auth/sms/send',
    { phone, purpose },
    true
  );
  return res.data;
}

export async function loginWithSms(
  payload: SmsLoginPayload
): Promise<AuthSession> {
  const res = await http.post<ApiSuccess<AuthSession>>(
    '/auth/sms/login',
    payload,
    true
  );
  return res.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await http.post<{ success: boolean; message?: string }>(
    '/auth/logout',
    { refreshToken },
    true
  );
}

export async function getProfile(): Promise<AuthUser> {
  const res = await http.get<ApiSuccess<AuthUser>>('/auth/profile');
  return res.data;
}

export async function updateProfile(fields: {
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
}): Promise<AuthUser> {
  const res = await http.put<ApiSuccess<AuthUser>>('/auth/profile', fields);
  return res.data;
}

export async function getIdentities(): Promise<IdentitySnapshot> {
  const res = await http.get<ApiSuccess<IdentitySnapshot>>('/auth/identities');
  return res.data;
}

export async function bindPhone(payload: {
  phone: string;
  code: string;
  currentPassword?: string;
  currentPhoneCode?: string;
}): Promise<AuthUser> {
  const res = await http.post<ApiSuccess<AuthUser>>('/auth/phone/bind', payload);
  return res.data;
}

export async function unbindPhone(payload: {
  password?: string;
  code?: string;
}): Promise<AuthUser> {
  const res = await http.delete<ApiSuccess<AuthUser> & { message?: string }>(
    '/auth/phone/bind',
    payload
  );
  return res.data;
}

export async function bindEmail(payload: {
  email: string;
  password?: string;
  currentPassword?: string;
}): Promise<AuthUser> {
  const res = await http.post<ApiSuccess<AuthUser>>('/auth/email/bind', payload);
  return res.data;
}

export async function unbindEmail(password: string): Promise<AuthUser> {
  const res = await http.delete<ApiSuccess<AuthUser> & { message?: string }>(
    '/auth/email/bind',
    { password }
  );
  return res.data;
}

export async function setPassword(
  password: string,
  confirmPassword: string
): Promise<AuthUser> {
  const res = await http.post<
    ApiSuccess<AuthUser> & { message?: string }
  >('/auth/password/set', { password, confirmPassword });
  return res.data;
}

export async function refreshToken(
  refreshTokenValue: string
): Promise<TokenPair> {
  const res = await http.post<ApiSuccess<TokenPair>>(
    '/auth/refresh-token',
    { refreshToken: refreshTokenValue },
    true
  );
  return res.data;
}
