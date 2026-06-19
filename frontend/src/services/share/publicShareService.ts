import publicApiClient from './publicApiClient';
import type { ShareScope } from './shareService';

export interface PublicShareMeta {
  ownerName: string;
  scope: ShareScope;
  expiresAt: string | null;
  requiresPin: boolean;
}

export interface PublicMetaResponse {
  success: boolean;
  data: PublicShareMeta;
}

export interface PublicVerifyResponse {
  success: boolean;
  message: string;
}

export interface PublicBloodTest {
  _id: string;
  date: string;
  wbc: number; rbc: number; hgb: number; plt: number;
  neu?: number; lym?: number;
  notes?: string;
  isAbnormal: boolean;
}

export interface PublicChemoCycle {
  _id: string;
  startDate: string;
  endDate: string;
  medications: Array<{ name: string; dosage: string; schedule: string }>;
  doctorNotes?: string;
}

export interface PublicAnalyticsTrend {
  date: string;
  wbc: number; rbc: number; hgb: number; plt: number;
  neu?: number; lym?: number;
  isAbnormal: boolean;
}

export interface PublicAnalytics {
  trends: PublicAnalyticsTrend[];
  summary: { totalTests: number; abnormalRate: number };
}

function pinHeader(pin?: string) {
  return pin ? { headers: { 'X-Share-Pin': pin } } : undefined;
}

class PublicShareService {
  async getMeta(token: string): Promise<PublicMetaResponse> {
    return publicApiClient.get<PublicMetaResponse>(`/public/shares/${token}`);
  }
  async verifyPin(token: string, pin: string): Promise<PublicVerifyResponse> {
    return publicApiClient.post<PublicVerifyResponse>(
      `/public/shares/${token}/verify`,
      { pin }
    );
  }
  async getBloodTests(token: string, pin?: string): Promise<{ success: boolean; data: PublicBloodTest[] }> {
    return publicApiClient.get(`/public/shares/${token}/blood-tests`, pinHeader(pin));
  }
  async getChemoCycles(token: string, pin?: string): Promise<{ success: boolean; data: PublicChemoCycle[] }> {
    return publicApiClient.get(`/public/shares/${token}/chemo-cycles`, pinHeader(pin));
  }
  async getAnalytics(token: string, range = 'all', pin?: string): Promise<{ success: boolean; data: PublicAnalytics }> {
    return publicApiClient.get(
      `/public/shares/${token}/analytics?range=${range}`,
      pinHeader(pin)
    );
  }
}

const publicShareService = new PublicShareService();
export default publicShareService;
