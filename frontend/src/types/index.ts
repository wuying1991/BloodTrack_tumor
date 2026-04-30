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
  firstName: string;
  lastName: string;
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
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
}

// ============================================================
// 化疗周期类型 (后端尚未实现，此为前置定义)
// TODO: 后端实现后移入 contracts/index.ts
// ============================================================

export interface ChemoCycle {
  _id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  medications: Array<{
    name: string;
    dosage: string;
    schedule: string;
  }>;
  doctorNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
