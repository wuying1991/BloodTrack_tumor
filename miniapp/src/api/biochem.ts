import { http } from '@/api/http';
import type { ApiSuccess } from '@/types/api';
import type {
  BiochemCreatePayload,
  BiochemListResult,
  BiochemTest,
} from '@/types/biochem';

export async function listBiochemTests(
  page = 1,
  limit = 20,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<BiochemListResult> {
  return http.get<BiochemListResult>('/biochem-tests', {
    page,
    limit,
    ...dateRange,
  });
}

export async function createBiochemTest(
  payload: BiochemCreatePayload
): Promise<BiochemTest> {
  const res = await http.post<ApiSuccess<BiochemTest>>(
    '/biochem-tests',
    payload
  );
  return res.data;
}

export async function deleteBiochemTest(id: string): Promise<void> {
  await http.delete(`/biochem-tests/${id}`);
}
