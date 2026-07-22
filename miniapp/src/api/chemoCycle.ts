import { http } from '@/api/http';
import type { ApiSuccess } from '@/types/api';
import type {
  ChemoCycle,
  ChemoCycleCreatePayload,
  ChemoCycleListResult,
} from '@/types/chemoCycle';

export async function listChemoCycles(
  page = 1,
  limit = 20
): Promise<ChemoCycleListResult> {
  return http.get<ChemoCycleListResult>('/chemo-cycles', { page, limit });
}

export async function createChemoCycle(
  payload: ChemoCycleCreatePayload
): Promise<ChemoCycle> {
  const res = await http.post<ApiSuccess<ChemoCycle>>('/chemo-cycles', payload);
  return res.data;
}

export async function deleteChemoCycle(id: string): Promise<void> {
  await http.delete(`/chemo-cycles/${id}`);
}
