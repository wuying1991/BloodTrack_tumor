export type BiochemKey =
  | 'alt' | 'ast' | 'ahr' | 'tbil' | 'dbil' | 'ibil'
  | 'tp' | 'alb' | 'glo' | 'ag' | 'ggt' | 'alp' | 'che' | 'tba' | 'pa'
  | 'bun' | 'cr' | 'ua' | 'egfr'
  | 'k' | 'na' | 'cl' | 'ca' | 'p' | 'ldh';

export interface BiochemTest {
  _id: string;
  user: string;
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
  isAbnormal: boolean;
  chemoCycleId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type BiochemCreatePayload = {
  date: string;
  notes?: string;
} & Partial<Record<BiochemKey, number>>;

export interface BiochemListResult {
  success: boolean;
  data: BiochemTest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
