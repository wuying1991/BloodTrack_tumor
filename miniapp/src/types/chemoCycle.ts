export interface ChemoMedication {
  name?: string;
  dosage?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
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

export interface ChemoCycleCreatePayload {
  regimenName: string;
  startDate: string;
  endDate?: string;
  medications?: ChemoMedication[];
  doctorNotes?: string;
}

export interface ChemoCycleListResult {
  success: boolean;
  data: ChemoCycle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
