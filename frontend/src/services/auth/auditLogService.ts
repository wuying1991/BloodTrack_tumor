import apiClient from '../api/apiClient';
import type { AuditLogEntry } from '../../types';

export interface AuditLogListResponse {
  success: boolean;
  data: AuditLogEntry[];
}

class AuditLogService {
  async getLogs(): Promise<AuditLogListResponse> {
    return apiClient.get<AuditLogListResponse>('/auth/audit-logs');
  }
}

const auditLogService = new AuditLogService();
export default auditLogService;
