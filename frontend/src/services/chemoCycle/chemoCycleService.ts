import apiClient from '../api/apiClient';

export interface ChemoMedication {
  name: string;
  dosage: string;
  schedule: string;
}

export interface ChemoCycle {
  _id: string;
  user: string;
  startDate: string;
  endDate: string;
  medications: ChemoMedication[];
  doctorNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChemoCycleFormData {
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
      startDate: formData.startDate,
      endDate: formData.endDate,
      medications: formData.medications.filter(m => m.name),
      doctorNotes: formData.doctorNotes || undefined,
    };
  }

  convertApiToFormData(chemoCycle: ChemoCycle): ChemoCycleFormData {
    return {
      startDate: chemoCycle.startDate ? chemoCycle.startDate.split('T')[0] : '',
      endDate: chemoCycle.endDate ? chemoCycle.endDate.split('T')[0] : '',
      medications: chemoCycle.medications || [],
      doctorNotes: chemoCycle.doctorNotes || '',
    };
  }
}

const chemoCycleService = new ChemoCycleService();
export default chemoCycleService;
