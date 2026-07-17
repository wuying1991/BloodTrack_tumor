import apiClient from '../api/apiClient';
import type { BiochemTest } from '../../types';

export interface BiochemTestFormData {
  date: string;
  alt?: string;
  ast?: string;
  ahr?: string;
  tbil?: string;
  dbil?: string;
  ibil?: string;
  tp?: string;
  alb?: string;
  glo?: string;
  ag?: string;
  ggt?: string;
  alp?: string;
  che?: string;
  tba?: string;
  pa?: string;
  bun?: string;
  cr?: string;
  ua?: string;
  egfr?: string;
  k?: string;
  na?: string;
  cl?: string;
  ca?: string;
  p?: string;
  ldh?: string;
  notes: string;
  chemoCycleId: string;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface GetBiochemTestsResponse {
  success: boolean;
  data: BiochemTest[];
  pagination: PaginationData;
}

export interface GetBiochemTestResponse {
  success: boolean;
  data: BiochemTest;
}

export interface CreateBiochemTestResponse {
  success: boolean;
  data: BiochemTest;
}

export interface DeleteBiochemTestResponse {
  success: boolean;
  message: string;
}

const NUMERIC_FIELDS: (keyof BiochemTestFormData)[] = [
  'alt', 'ast', 'ahr', 'tbil', 'dbil', 'ibil', 'tp', 'alb', 'glo', 'ag',
  'ggt', 'alp', 'che', 'tba', 'pa',
  'bun', 'cr', 'ua', 'egfr',
  'k', 'na', 'cl', 'ca', 'p',
  'ldh',
];

class BiochemService {
  async getBiochemTests(page = 1, limit = 20): Promise<GetBiochemTestsResponse> {
    return apiClient.get<GetBiochemTestsResponse>(
      `/biochem-tests?page=${page}&limit=${limit}`
    );
  }

  async getBiochemTestById(id: string): Promise<GetBiochemTestResponse> {
    return apiClient.get<GetBiochemTestResponse>(`/biochem-tests/${id}`);
  }

  async createBiochemTest(data: Partial<BiochemTest>): Promise<CreateBiochemTestResponse> {
    return apiClient.post<CreateBiochemTestResponse>('/biochem-tests', data);
  }

  async updateBiochemTest(id: string, data: Partial<BiochemTest>): Promise<GetBiochemTestResponse> {
    return apiClient.put<GetBiochemTestResponse>(`/biochem-tests/${id}`, data);
  }

  async deleteBiochemTest(id: string): Promise<DeleteBiochemTestResponse> {
    return apiClient.delete<DeleteBiochemTestResponse>(`/biochem-tests/${id}`);
  }

  async exportCsv(): Promise<Blob> {
    return apiClient.download('/biochem-tests/export?format=csv');
  }

  convertFormToApiData(formData: BiochemTestFormData): Partial<BiochemTest> {
    const result: Record<string, unknown> = {
      date: formData.date,
      notes: formData.notes.trim() || undefined,
      chemoCycleId: formData.chemoCycleId || undefined,
    };

    for (const field of NUMERIC_FIELDS) {
      const value = formData[field];
      if (value !== undefined && value !== null && value !== '') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          result[field as string] = num;
        }
      }
    }

    return result as Partial<BiochemTest>;
  }

  convertApiToFormData(test: BiochemTest): BiochemTestFormData {
    const toString = (val: number | undefined | null): string =>
      val !== undefined && val !== null ? String(val) : '';

    return {
      date: test.date ? test.date.split('T')[0] : '',
      alt: toString(test.alt),
      ast: toString(test.ast),
      ahr: toString(test.ahr),
      tbil: toString(test.tbil),
      dbil: toString(test.dbil),
      ibil: toString(test.ibil),
      tp: toString(test.tp),
      alb: toString(test.alb),
      glo: toString(test.glo),
      ag: toString(test.ag),
      ggt: toString(test.ggt),
      alp: toString(test.alp),
      che: toString(test.che),
      tba: toString(test.tba),
      pa: toString(test.pa),
      bun: toString(test.bun),
      cr: toString(test.cr),
      ua: toString(test.ua),
      egfr: toString(test.egfr),
      k: toString(test.k),
      na: toString(test.na),
      cl: toString(test.cl),
      ca: toString(test.ca),
      p: toString(test.p),
      ldh: toString(test.ldh),
      notes: test.notes || '',
      chemoCycleId: test.chemoCycleId || '',
    };
  }
}

const biochemService = new BiochemService();
export default biochemService;
