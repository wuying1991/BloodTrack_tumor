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
  crp?: number;
  notes?: string;
  isAbnormal: boolean;
  chemoCycleId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BloodTestCreatePayload {
  date: string;
  wbc: number;
  rbc: number;
  hgb: number;
  plt: number;
  neu?: number;
  lym?: number;
  crp?: number;
  notes?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface BloodTestListResult {
  success: boolean;
  data: BloodTest[];
  pagination: PaginationMeta;
}

export interface BloodTestFormValues {
  date: string;
  wbc: string;
  rbc: string;
  hgb: string;
  plt: string;
  neu: string;
  lym: string;
  crp: string;
  notes: string;
}
