import apiClient from '../api/apiClient';

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

export interface ChemoCycleFormData {
  regimenName: string;
  startDate: string;
  endDate: string;
  medications: ChemoMedication[];
  doctorNotes: string;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface GetChemoCyclesResponse {
  success: boolean;
  data: ChemoCycle[];
  pagination: PaginationData;
}

export interface GetChemoCycleResponse {
  success: boolean;
  data: ChemoCycle;
}

export interface CreateChemoCycleResponse {
  success: boolean;
  data: ChemoCycle;
}

export interface DeleteChemoCycleResponse {
  success: boolean;
  message: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateInput(value?: string): string {
  if (!value) return '';
  return value.split('T')[0];
}

function hasMedicationContent(m: ChemoMedication): boolean {
  return ['name', 'dosage', 'startDate', 'endDate', 'notes'].some(key => {
    const value = (m as Record<string, unknown>)[key];
    return typeof value === 'string' ? value.trim().length > 0 : !!value;
  });
}

export function addDaysLocal(dateInput: string, days: number): string {
  if (!dateInput) return '';
  const date = new Date(`${dateInput}T00:00:00`);
  return new Date(date.getTime() + days * DAY_MS).toISOString().split('T')[0];
}

class ChemoCycleService {
  async getChemoCycles(page = 1, limit = 20): Promise<GetChemoCyclesResponse> {
    return apiClient.get<GetChemoCyclesResponse>(
      `/chemo-cycles?page=${page}&limit=${limit}`
    );
  }

  async getChemoCycleById(id: string): Promise<GetChemoCycleResponse> {
    return apiClient.get<GetChemoCycleResponse>(`/chemo-cycles/${id}`);
  }

  async createChemoCycle(
    data: Partial<ChemoCycle>
  ): Promise<CreateChemoCycleResponse> {
    return apiClient.post<CreateChemoCycleResponse>('/chemo-cycles', data);
  }

  async updateChemoCycle(
    id: string,
    data: Partial<ChemoCycle>
  ): Promise<GetChemoCycleResponse> {
    return apiClient.put<GetChemoCycleResponse>(`/chemo-cycles/${id}`, data);
  }

  async deleteChemoCycle(id: string): Promise<DeleteChemoCycleResponse> {
    return apiClient.delete<DeleteChemoCycleResponse>(`/chemo-cycles/${id}`);
  }

  convertFormToApiData(formData: ChemoCycleFormData): Partial<ChemoCycle> {
    return {
      regimenName: formData.regimenName.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      medications: formData.medications.filter(hasMedicationContent).map(m => ({
        name: m.name?.trim() || undefined,
        dosage: m.dosage?.trim() || undefined,
        startDate: m.startDate || undefined,
        endDate: m.endDate || undefined,
        notes: m.notes?.trim() || m.schedule?.trim() || undefined,
      })),
      doctorNotes: formData.doctorNotes.trim() || undefined,
    };
  }

  convertApiToFormData(chemoCycle: ChemoCycle): ChemoCycleFormData {
    return {
      regimenName: chemoCycle.regimenName || '未命名方案',
      startDate: toDateInput(chemoCycle.startDate),
      endDate: toDateInput(chemoCycle.endDate),
      medications: (chemoCycle.medications || []).map(m => ({
        name: m.name || '',
        dosage: m.dosage || '',
        startDate:
          toDateInput(m.startDate) || toDateInput(chemoCycle.startDate),
        endDate: toDateInput(m.endDate) || toDateInput(chemoCycle.endDate),
        notes: m.notes || m.schedule || '',
      })),
      doctorNotes: chemoCycle.doctorNotes || '',
    };
  }
}

const chemoCycleService = new ChemoCycleService();
export default chemoCycleService;
