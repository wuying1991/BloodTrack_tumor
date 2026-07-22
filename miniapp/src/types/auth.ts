export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginMethods {
  emailPassword: boolean;
  phonePassword: boolean;
  phoneSms: boolean;
}

export interface AuthUser {
  _id: string;
  email?: string;
  phone?: string;
  fullName: string;
  hasPassword?: boolean;
  methods?: LoginMethods;
  canUnbindPhone?: boolean;
  canUnbindEmail?: boolean;
  settings?: {
    notifications?: { email?: boolean; push?: boolean };
    dataSharing?: { enabled?: boolean };
    language?: 'zh-CN' | 'en-US';
  };
  dateOfBirth?: string;
  gender?: string;
}

export type AuthSession = AuthUser & TokenPair;

export interface LoginCredentials {
  /** email or phone or mixed via account */
  email?: string;
  phone?: string;
  account?: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface SmsSendResult {
  expiresIn: number;
  cooldown: number;
  devCode?: string;
}

export interface SmsLoginPayload {
  phone: string;
  code: string;
  fullName?: string;
}

export interface IdentitySnapshot {
  email: string | null;
  phone: string | null;
  hasPassword: boolean;
  methods: LoginMethods;
}
