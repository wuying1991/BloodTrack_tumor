import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { SmsCode, SmsPurpose } from '../../models/SmsCode';
import { ApiError } from '../../utils/ApiError';
import { createSmsProvider, maskPhone } from './SmsProvider';

const CODE_TTL_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_PHONE_DAY = 20;

const provider = createSmsProvider();

/** Normalize CN mobile: digits only, 11 starting with 1. */
export function normalizePhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  if (digits.length === 13 && digits.startsWith('86')) {
    const local = digits.slice(2);
    if (local.length === 11 && local.startsWith('1')) return local;
  }
  throw ApiError.badRequest('请输入有效的中国大陆手机号', undefined, 'INVALID_PHONE');
}

function generateCode(): string {
  const fixed = process.env.SMS_FIXED_CODE;
  if (
    fixed &&
    process.env.NODE_ENV !== 'production' &&
    /^\d{4,8}$/.test(fixed)
  ) {
    return fixed;
  }
  return String(crypto.randomInt(100000, 999999));
}

function isDevCodeExposed(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

export async function sendLoginCode(
  phoneRaw: string,
  purpose: SmsPurpose = 'login'
): Promise<{ expiresIn: number; cooldown: number; devCode?: string }> {
  const phone = normalizePhone(phoneRaw);

  const latest = await SmsCode.findOne({ phone, purpose }).sort({ createdAt: -1 });
  if (latest && Date.now() - latest.createdAt.getTime() < COOLDOWN_MS) {
    const wait = Math.ceil(
      (COOLDOWN_MS - (Date.now() - latest.createdAt.getTime())) / 1000
    );
    throw ApiError.badRequest(
      `发送过于频繁，请 ${wait} 秒后再试`,
      undefined,
      'SMS_COOLDOWN'
    );
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const sentToday = await SmsCode.countDocuments({
    phone,
    purpose,
    createdAt: { $gte: dayStart },
  });
  if (sentToday >= MAX_SENDS_PER_PHONE_DAY) {
    throw ApiError.badRequest(
      '今日发送次数已达上限',
      undefined,
      'SMS_RATE_LIMITED'
    );
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await SmsCode.create({ phone, codeHash, purpose, expiresAt, attempts: 0 });
  await provider.sendLoginCode(phone, code);

  return {
    expiresIn: Math.floor(CODE_TTL_MS / 1000),
    cooldown: Math.floor(COOLDOWN_MS / 1000),
    ...(isDevCodeExposed() ? { devCode: code } : {}),
  };
}

export async function verifyLoginCode(
  phoneRaw: string,
  codeRaw: string,
  purpose: SmsPurpose = 'login'
): Promise<string> {
  const phone = normalizePhone(phoneRaw);
  const code = String(codeRaw || '').trim();

  if (!/^\d{4,8}$/.test(code)) {
    throw ApiError.badRequest('验证码格式不正确', undefined, 'INVALID_CODE');
  }

  const record = await SmsCode.findOne({
    phone,
    purpose,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record) {
    throw ApiError.unauthorized('验证码无效或已过期', 'CODE_EXPIRED');
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await SmsCode.deleteOne({ _id: record._id });
    throw ApiError.unauthorized('验证码错误次数过多，请重新获取', 'INVALID_CODE');
  }

  const ok = await bcrypt.compare(code, record.codeHash);
  if (!ok) {
    record.attempts += 1;
    await record.save();
    throw ApiError.unauthorized('验证码错误或已过期', 'INVALID_CODE');
  }

  // One-time use
  await SmsCode.deleteMany({ phone, purpose });
  return phone;
}

export { maskPhone };
