import apiClient from '../api/apiClient';
import { BloodTest } from '../../types';

export interface BloodTestFormData {
  date: string;
  wbc: string;
  rbc: string;
  hgb: string;
  plt: string;
  neu: string;
  lym: string;
  notes: string;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface GetBloodTestsResponse {
  success: boolean;
  data: BloodTest[];
  pagination: PaginationData;
}

export interface GetBloodTestResponse {
  success: boolean;
  data: BloodTest;
}

export interface CreateBloodTestResponse {
  success: boolean;
  data: BloodTest;
}

export interface DeleteBloodTestResponse {
  success: boolean;
  message: string;
}

/**
 * Blood Test Service
 * Handles all blood test related API operations
 */
class BloodTestService {
  /**
   * Get all blood tests with pagination
   */
  async getBloodTests(page = 1, limit = 20): Promise<GetBloodTestsResponse> {
    return apiClient.get<GetBloodTestsResponse>(
      `/blood-tests?page=${page}&limit=${limit}`
    );
  }

  /**
   * Get a single blood test by ID
   */
  async getBloodTestById(id: string): Promise<GetBloodTestResponse> {
    return apiClient.get<GetBloodTestResponse>(`/blood-tests/${id}`);
  }

  /**
   * Create a new blood test
   */
  async createBloodTest(
    data: Partial<BloodTest>
  ): Promise<CreateBloodTestResponse> {
    return apiClient.post<CreateBloodTestResponse>('/blood-tests', data);
  }

  /**
   * Update a blood test
   */
  async updateBloodTest(
    id: string,
    data: Partial<BloodTest>
  ): Promise<GetBloodTestResponse> {
    return apiClient.put<GetBloodTestResponse>(`/blood-tests/${id}`, data);
  }

  /**
   * Delete a blood test
   */
  async deleteBloodTest(id: string): Promise<DeleteBloodTestResponse> {
    return apiClient.delete<DeleteBloodTestResponse>(`/blood-tests/${id}`);
  }

  /**
   * Convert form data to API data format
   */
  convertFormToApiData(formData: BloodTestFormData): Partial<BloodTest> {
    return {
      date: formData.date,
      wbc: formData.wbc ? parseFloat(formData.wbc) : 0,
      rbc: formData.rbc ? parseFloat(formData.rbc) : 0,
      hgb: formData.hgb ? parseFloat(formData.hgb) : 0,
      plt: formData.plt ? parseFloat(formData.plt) : 0,
      neu: formData.neu ? parseFloat(formData.neu) : undefined,
      lym: formData.lym ? parseFloat(formData.lym) : undefined,
      notes: formData.notes || undefined,
    };
  }

  /**
   * Convert API data to form data format
   */
  convertApiToFormData(bloodTest: BloodTest): BloodTestFormData {
    return {
      date: bloodTest.date ? bloodTest.date.split('T')[0] : '',
      wbc: bloodTest.wbc?.toString() || '',
      rbc: bloodTest.rbc?.toString() || '',
      hgb: bloodTest.hgb?.toString() || '',
      plt: bloodTest.plt?.toString() || '',
      neu: bloodTest.neu?.toString() || '',
      lym: bloodTest.lym?.toString() || '',
      notes: bloodTest.notes || '',
    };
  }
}

const bloodTestService = new BloodTestService();
export default bloodTestService;
