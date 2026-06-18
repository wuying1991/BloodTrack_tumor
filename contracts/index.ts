/**
 * 共享数据契约 (Shared Data Contracts)
 * 前后端唯一数据真相源 (Single Source of Truth)
 *
 * 规则:
 * 1. 后端 Model/Controller 的输出必须匹配此处定义
 * 2. 前端 types 和服务层必须从此处导入类型
 * 3. 任何字段变更必须两边同步更新，CI 阶段自动校验
 */

// ============================================================
// 基础 API 响应包装
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>;
  statusCode: number;
  stack?: string;
}

// ============================================================
// 认证 (Auth)
// ============================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  settings?: UserSettings;
}

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
  };
  dataSharing: {
    enabled: boolean;
    sharedWith: string[];
  };
}

export type RegisterResponse = ApiResponse<AuthUser & TokenPair>;
export type LoginResponse = ApiResponse<AuthUser & TokenPair>;
export type RefreshTokenResponse = ApiResponse<TokenPair>;
export type LogoutResponse = ApiResponse<{ message: string }>;

// ============================================================
// 用户资料 (User Profile - 完整模型)
// ============================================================

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  settings: UserSettings;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// 血常规检查 (Blood Test)
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
  isAbnormal: boolean;
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
  /** 显式关联到周期；不传则按 date 自动关联；显式传 null 解除关联 */
  chemoCycleId?: string | null;
}

export type BloodTestUpdateRequest = Partial<BloodTestCreateRequest>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type BloodTestListResponse = ApiResponse<BloodTest[]> & {
  pagination: PaginationMeta;
};
export type BloodTestResponse = ApiResponse<BloodTest>;
export type BloodTestDeleteResponse = ApiResponse<{ message: string }>;

// ============================================================
// 提醒 (Reminder)
// ============================================================

export type ReminderType =
  | 'blood-test'
  | 'chemo-cycle'
  | 'medication'
  | 'follow-up'
  | 'custom';

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  _id: string;
  user: string;
  title: string;
  description?: string;
  type: ReminderType;
  dueDate: string;
  recurrence: ReminderRecurrence;
  enabled: boolean;
  completed: boolean;
  notifications: { email: boolean; push: boolean };
  lastTriggeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReminderCreateRequest {
  title: string;
  description?: string;
  type?: ReminderType;
  dueDate: string;
  recurrence?: ReminderRecurrence;
  enabled?: boolean;
  notifications?: { email?: boolean; push?: boolean };
}

export type ReminderUpdateRequest = Partial<ReminderCreateRequest> & {
  completed?: boolean;
};

export type ReminderListResponse = ApiResponse<Reminder[]>;
export type ReminderResponse = ApiResponse<Reminder>;
export type ReminderDeleteResponse = ApiResponse<{ message: string }>;

// ============================================================
// 正常参考范围
// ============================================================

export interface NormalRange {
  min: number;
  max: number;
  unit: string;
  name: string;
}

export const BLOOD_TEST_NORMAL_RANGES: Record<string, NormalRange> = {
  wbc: { min: 4.0, max: 10.0, unit: '\u00d710\u2079/L', name: '\u767d\u7ec6\u80de (WBC)' },
  rbc: { min: 3.5, max: 5.8, unit: '\u00d710\u00b9\u00b2/L', name: '\u7ea2\u7ec6\u80de (RBC)' },
  hgb: { min: 110, max: 165, unit: 'g/L', name: '\u8840\u7ea2\u86cb\u767d (HGB)' },
  plt: { min: 100, max: 300, unit: '\u00d710\u2079/L', name: '\u8840\u5c0f\u677f (PLT)' },
  neu: { min: 1.8, max: 6.3, unit: '\u00d710\u2079/L', name: '\u4e2d\u6027\u7c92\u7ec6\u80de (NEU)' },
  lym: { min: 1.0, max: 4.8, unit: '\u00d710\u2079/L', name: '\u6dcb\u5df4\u7ec6\u80de (LYM)' },
};
