import apiClient from '../api/apiClient';

export interface ShareScope {
  bloodTests: boolean;
  chemoCycles: boolean;
  analytics: boolean;
}

export type ShareExpiresIn = '1d' | '7d' | '30d' | '90d' | 'never';

export interface ShareListItem {
  _id: string;
  scope: ShareScope;
  expiresAt: string | null;
  hasPin: boolean;
  createdAt: string;
}

export interface ShareCreatePayload {
  scope: ShareScope;
  expiresIn: ShareExpiresIn;
  pin?: string;
}

export interface ShareCreated extends ShareListItem {
  token: string;
  shareUrl: string;
}

export interface ShareListResponse {
  success: boolean;
  data: ShareListItem[];
}

export interface ShareCreateResponse {
  success: boolean;
  data: ShareCreated;
}

export interface ShareDeleteResponse {
  success: boolean;
  message: string;
}

class ShareService {
  async listShares(): Promise<ShareListResponse> {
    return apiClient.get<ShareListResponse>('/shares');
  }

  async createShare(data: ShareCreatePayload): Promise<ShareCreateResponse> {
    return apiClient.post<ShareCreateResponse>('/shares', data);
  }

  async deleteShare(id: string): Promise<ShareDeleteResponse> {
    return apiClient.delete<ShareDeleteResponse>(`/shares/${id}`);
  }
}

const shareService = new ShareService();
export default shareService;
