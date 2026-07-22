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
  errorCodes?: Record<string, string>;
  code?: string;
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
  fullName: string;
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
  fullName: string;
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
  language?: 'zh-CN' | 'en-US';
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
  fullName: string;
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
  /** C-reactive protein (mg/L) */
  crp?: number;
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
  crp?: number;
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
// 化疗周期 (Chemo Cycle)
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

export type ChemoCycleListResponse = ApiResponse<ChemoCycle[]> & {
  pagination: PaginationMeta;
};
export type ChemoCycleResponse = ApiResponse<ChemoCycle>;
export type ChemoCycleDeleteResponse = ApiResponse<{ message: string }>;

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
  crp: { min: 0, max: 10, unit: 'mg/L', name: 'C\u53cd\u5e94\u86cb\u767d (CRP)' },
};

// ============================================================
// \u6570\u636e\u5171\u4eab (Data Sharing) \u2014 M-P4
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
  token: string;       // 64-char hex\uff0c\u4ec5\u672c\u6b21\u8fd4\u56de
  shareUrl: string;
  createdAt: string;
}

export type ShareListResponse = ApiResponse<Share[]>;
export type ShareCreateResponse = ApiResponse<ShareCreateResponseData>;
export type ShareDeleteResponse = ApiResponse<{ message: string }>;

// \u516c\u5f00\u7aef
export interface PublicShareMeta {
  ownerName: string;        // "<firstName> <lastName>"
  scope: ShareScope;
  expiresAt: string | null;
  requiresPin: boolean;
}

export type PublicShareMetaResponse = ApiResponse<PublicShareMeta>;
export type PublicSharePinVerifyResponse = ApiResponse<{ message: string }>;

// ============================================================
// 安全审计日志 (Audit Log) — L-P2
// ============================================================

export type AuditAction =
  | 'login'
  | 'logout'
  | 'register'
  | 'refresh_token'
  | 'forgot_password'
  | 'reset_password'
  | 'change_password'
  | 'delete_account'
  | 'share_create'
  | 'share_revoke';

export type AuditAnomalyType = 'new_ip' | 'brute_force';

export interface AuditLogEntry {
  _id: string;
  action: AuditAction;
  success: boolean;
  ip: string;
  userAgent: string;
  detail?: string;
  detailCode?: string;
  detailParams?: Record<string, unknown>;
  isAnomaly: boolean;
  anomalyType?: AuditAnomalyType;
  createdAt: string;
}

export type AuditLogListResponse = ApiResponse<AuditLogEntry[]>;

// ============================================================
// 生化全套 (Biochem Test) - 肝肾功能 + 电解质
// ============================================================

export interface BiochemTest {
  _id: string;
  user: string;
  date: string;
  // 肝功能
  alt?: number;   // 谷丙转氨酶
  ast?: number;   // 谷草转氨酶
  ahr?: number;   // AST/ALT 比值
  tbil?: number;  // 总胆红素
  dbil?: number;  // 直接胆红素
  ibil?: number;  // 间接胆红素
  tp?: number;    // 总蛋白
  alb?: number;   // 白蛋白
  glo?: number;   // 球蛋白
  ag?: number;    // 白球比
  ggt?: number;   // γ-谷氨酰转肽酶
  alp?: number;   // 碱性磷酸酶
  che?: number;   // 胆碱酯酶
  tba?: number;   // 总胆汁酸
  pa?: number;    // 前白蛋白
  // 肾功能
  bun?: number;   // 尿素氮
  cr?: number;    // 肌酐
  ua?: number;    // 尿酸
  egfr?: number;  // 估算肾小球滤过率
  // 电解质
  k?: number;     // 钾
  na?: number;    // 钠
  cl?: number;    // 氯
  ca?: number;    // 钙
  p?: number;     // 磷
  // 其他
  ldh?: number;   // 乳酸脱氢酶
  notes?: string;
  isAbnormal: boolean;
  chemoCycleId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BiochemTestCreateRequest {
  date: string;
  alt?: number;
  ast?: number;
  ahr?: number;
  tbil?: number;
  dbil?: number;
  ibil?: number;
  tp?: number;
  alb?: number;
  glo?: number;
  ag?: number;
  ggt?: number;
  alp?: number;
  che?: number;
  tba?: number;
  pa?: number;
  bun?: number;
  cr?: number;
  ua?: number;
  egfr?: number;
  k?: number;
  na?: number;
  cl?: number;
  ca?: number;
  p?: number;
  ldh?: number;
  notes?: string;
  chemoCycleId?: string | null;
}

export type BiochemTestUpdateRequest = Partial<BiochemTestCreateRequest>;

export type BiochemTestListResponse = ApiResponse<BiochemTest[]> & {
  pagination: PaginationMeta;
};
export type BiochemTestResponse = ApiResponse<BiochemTest>;
export type BiochemTestDeleteResponse = ApiResponse<{ message: string }>;

export const BIOCHEM_TEST_NORMAL_RANGES: Record<string, NormalRange> = {
  alt:   { min: 7,    max: 40,    unit: 'U/L',      name: '谷丙转氨酶 (ALT)' },
  ast:   { min: 13,   max: 35,    unit: 'U/L',      name: '谷草转氨酶 (AST)' },
  ahr:   { min: 0.5,  max: 2.0,   unit: '',          name: 'AST/ALT 比值' },
  tbil:  { min: 3.4,  max: 20.5,  unit: 'μmol/L', name: '总胆红素 (TBIL)' },
  dbil:  { min: 0,    max: 6.8,   unit: 'μmol/L', name: '直接胆红素 (DBIL)' },
  ibil:  { min: 1.7,  max: 13.7,  unit: 'μmol/L', name: '间接胆红素 (IBIL)' },
  tp:    { min: 65,   max: 85,    unit: 'g/L',      name: '总蛋白 (TP)' },
  alb:   { min: 35,   max: 50,    unit: 'g/L',      name: '白蛋白 (ALB)' },
  glo:   { min: 20,   max: 40,    unit: 'g/L',      name: '球蛋白 (GLO)' },
  ag:    { min: 1.2,  max: 2.0,   unit: '',          name: '白球比 (A/G)' },
  ggt:   { min: 7,    max: 45,    unit: 'U/L',      name: 'γ-谷氨酰转肽酶 (GGT)' },
  alp:   { min: 40,   max: 150,   unit: 'U/L',      name: '碱性磷酸酶 (ALP)' },
  che:   { min: 4000, max: 12000, unit: 'U/L',      name: '胆碱酯酶 (CHE)' },
  tba:   { min: 0,    max: 10,    unit: 'μmol/L', name: '总胆汁酸 (TBA)' },
  pa:    { min: 200,  max: 400,   unit: 'mg/L',     name: '前白蛋白 (PA)' },
  bun:   { min: 2.9,  max: 7.5,   unit: 'mmol/L',   name: '尿素氮 (BUN)' },
  cr:    { min: 44,   max: 133,   unit: 'μmol/L', name: '肌酐 (Cr)' },
  ua:    { min: 149,  max: 416,   unit: 'μmol/L', name: '尿酸 (UA)' },
  egfr:  { min: 90,   max: 999,   unit: 'mL/min',   name: '估算肾小球滤过率 (eGFR)' },
  k:     { min: 3.5,  max: 5.5,   unit: 'mmol/L',   name: '钾 (K)' },
  na:    { min: 135,  max: 145,   unit: 'mmol/L',   name: '钠 (Na)' },
  cl:    { min: 95,   max: 105,   unit: 'mmol/L',   name: '氯 (Cl)' },
  ca:    { min: 2.1,  max: 2.6,   unit: 'mmol/L',   name: '钙 (Ca)' },
  p:     { min: 0.8,  max: 1.6,   unit: 'mmol/L',   name: '磷 (P)' },
  ldh:   { min: 120,  max: 250,   unit: 'U/L',      name: '乳酸脱氢酶 (LDH)' },
};
