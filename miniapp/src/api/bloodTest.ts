import { http } from '@/api/http';
import type { ApiSuccess } from '@/types/api';
import type {
  BloodTest,
  BloodTestCreatePayload,
  BloodTestListResult,
} from '@/types/bloodTest';

export async function listBloodTests(
  page = 1,
  limit = 20,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<BloodTestListResult> {
  return http.get<BloodTestListResult>('/blood-tests', {
    page,
    limit,
    ...dateRange,
  });
}

export async function getBloodTest(id: string): Promise<BloodTest> {
  const res = await http.get<ApiSuccess<BloodTest>>(`/blood-tests/${id}`);
  return res.data;
}

export async function createBloodTest(
  payload: BloodTestCreatePayload
): Promise<BloodTest> {
  const res = await http.post<ApiSuccess<BloodTest>>('/blood-tests', payload);
  return res.data;
}

export async function deleteBloodTest(id: string): Promise<void> {
  await http.delete<{ success: boolean; message?: string }>(
    `/blood-tests/${id}`
  );
}
