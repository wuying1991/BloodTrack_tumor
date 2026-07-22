import { IUser } from '../models/User';
import { normalizePhone } from '../services/sms/smsCodeService';
import { ApiError } from './ApiError';

export interface LoginMethods {
  emailPassword: boolean;
  phonePassword: boolean;
  phoneSms: boolean;
}

export interface IdentitySnapshot {
  email: string | null;
  phone: string | null;
  hasPassword: boolean;
  methods: LoginMethods;
}

export function identitySnapshot(user: {
  email?: string | null;
  phone?: string | null;
  passwordHash?: string | null;
}): IdentitySnapshot {
  const email = user.email || null;
  const phone = user.phone || null;
  const hasPassword = !!user.passwordHash;
  return {
    email,
    phone,
    hasPassword,
    methods: {
      emailPassword: !!(email && hasPassword),
      phonePassword: !!(phone && hasPassword),
      phoneSms: !!phone,
    },
  };
}

const PASSWORD_STRENGTH = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export function assertPasswordStrength(password: string): void {
  if (!password || password.length < 6) {
    throw ApiError.badRequest(
      '密码至少需要6个字符',
      undefined,
      'VALIDATION_PASSWORD_STRENGTH'
    );
  }
  if (!PASSWORD_STRENGTH.test(password)) {
    throw ApiError.badRequest(
      '密码必须包含大小写字母和数字',
      undefined,
      'VALIDATION_PASSWORD_STRENGTH'
    );
  }
}

/**
 * Resolve login identifier from body:
 * - email
 * - phone
 * - account (auto: contains @ → email, else phone)
 */
export function resolvePasswordLoginLookup(body: {
  email?: string;
  phone?: string;
  account?: string;
}): { email?: string; phone?: string } {
  let email = body.email ? String(body.email).trim().toLowerCase() : '';
  let phoneRaw = body.phone ? String(body.phone).trim() : '';
  const account = body.account ? String(body.account).trim() : '';

  if (account && !email && !phoneRaw) {
    if (account.includes('@')) {
      email = account.toLowerCase();
    } else {
      phoneRaw = account;
    }
  }

  if (email) {
    return { email };
  }
  if (phoneRaw) {
    return { phone: normalizePhone(phoneRaw) };
  }
  throw ApiError.badRequest(
    '请输入邮箱或手机号',
    undefined,
    'AUTH_ACCOUNT_REQUIRED'
  );
}

export function profilePayload(user: IUser & { createdAt?: Date; updatedAt?: Date }) {
  const identity = identitySnapshot(user);
  return {
    _id: user._id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    settings: user.settings,
    hasPassword: identity.hasPassword,
    methods: identity.methods,
    /** 当前已绑手机，且解绑后仍可用邮箱+密码 */
    canUnbindPhone: !!(identity.phone && identity.email && identity.hasPassword),
    /** 当前已绑邮箱，且解绑后仍可用手机登录 */
    canUnbindEmail: !!(identity.email && identity.phone),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** After unbinding phone, account must keep email + password. */
export function assertCanUnbindPhone(user: {
  email?: string | null;
  passwordHash?: string | null;
}): void {
  if (!user.email || !user.passwordHash) {
    throw ApiError.badRequest(
      '解绑手机前请先绑定邮箱并设置密码，以保留至少一种登录方式',
      undefined,
      'CANNOT_UNBIND_LAST_METHOD'
    );
  }
}

/** After unbinding email, account must keep phone. */
export function assertCanUnbindEmail(user: { phone?: string | null }): void {
  if (!user.phone) {
    throw ApiError.badRequest(
      '解绑邮箱前请先绑定手机号，以保留至少一种登录方式',
      undefined,
      'CANNOT_UNBIND_LAST_METHOD'
    );
  }
}
