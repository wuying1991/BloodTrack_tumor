/**
 * 前端类型定义
 *
 * 契约基准文件: ../../contracts/index.ts (CI 自动校验与此文件的一致性)
 * 规则: 任何字段变更必须同步更新 contracts/index.ts
 */

// ============================================================
// API 响应包装
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================================
// 用户相关类型
// ============================================================

export interface User {
  _id: string;
  email: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  settings: {
    notifications: {
      email: boolean;
      push: boolean;
    };
    dataSharing: {
      enabled: boolean;
      sharedWith: string[];
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// 血常规检查结果类型
// Fields exactly match backend IBloodTest model schema
// and contracts/index.ts BloodTest
// ============================================================

export interface BloodTest {
  _id: string;
  user: string;
  date: string;
  wbc: number;
  rbc: number;
  hgb: number;
  plt: number;
  neu?: number;
  lym?: number;
  notes?: string;
  isAbnormal?: boolean;
  chemoCycleId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BloodTestCreateRequest {
  date: string;
  wbc: number;
  rbc: number;
  hgb: number;
  plt: number;
  neu?: number;
  lym?: number;
  notes?: string;
  chemoCycleId?: string | null;
}

export type BloodTestUpdateRequest = Partial<BloodTestCreateRequest>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ============================================================
// 认证相关类型
// ============================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
}

// ============================================================
// 化疗周期类型
// ============================================================

export interface ChemoMedication {
  name?: string;
  dosage?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  /** legacy only: old records used schedule; normalize to notes when read */
  schedule?: string;
}

export interface ChemoCycle {
  _id: string;
  user: string;
  regimenName: string;
  startDate: string;
  endDate: string;
  medications: ChemoMedication[];
  doctorNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChemoCycleCreateRequest {
  regimenName: string;
  startDate: string;
  endDate?: string;
  medications?: ChemoMedication[];
  doctorNotes?: string;
}

export type ChemoCycleUpdateRequest = Partial<ChemoCycleCreateRequest>;

// ============================================================
// 提醒类型 (后端尚未实现，此为前置定义)
// TODO: 后端实现后移入 contracts/index.ts
// ============================================================

export interface Reminder {
  _id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  date: Date;
  isRecurring: boolean;
  recurrencePattern?: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 血液指标正常范围
// ============================================================

export interface BloodTestRanges {
  wbc: { min: number; max: number; unit: string };
  rbc: { min: number; max: number; unit: string };
  hgb: { min: number; max: number; unit: string };
  plt: { min: number; max: number; unit: string };
  neu: { min: number; max: number; unit: string };
  lym: { min: number; max: number; unit: string };
}

// ============================================================
// 数据共享 (Data Sharing) — M-P4
// ============================================================

export interface ShareScope {
  bloodTests: boolean;
  chemoCycles: boolean;
  analytics: boolean;
}

export type ShareExpiresIn = '1d' | '7d' | '30d' | '90d' | 'never';

export interface Share {
  _id: string;
  scope: ShareScope;
  expiresAt: string | null;
  hasPin: boolean;
  createdAt: string;
}

export interface ShareCreateRequest {
  scope: ShareScope;
  expiresIn: ShareExpiresIn;
  pin?: string;
}

export interface ShareCreateResponseData {
  _id: string;
  scope: ShareScope;
  expiresAt: string | null;
  hasPin: boolean;
  token: string;       // 64-char hex，仅本次返回
  shareUrl: string;
  createdAt: string;
}

export type ShareListResponse = ApiResponse<Share[]>;
export type ShareCreateResponse = ApiResponse<ShareCreateResponseData>;
export type ShareDeleteResponse = ApiResponse<{ message: string }>;

// 公开端
export interface PublicShareMeta {
  ownerName: string;        // 分享者 fullName
  scope: ShareScope;
  expiresAt: string | null;
  requiresPin: boolean;
}

export type PublicShareMetaResponse = ApiResponse<PublicShareMeta>;
export type PublicSharePinVerifyResponse = ApiResponse<{ message: string }>;
