import { Request } from 'express';
import { AuditLog, AuditAction } from '../models/AuditLog';

interface RecordAuditParams {
  user?: import('mongoose').Types.ObjectId | string | null;
  action: AuditAction;
  success: boolean;
  req: Request;
  detail?: string;
  detailCode?: string;
  detailParams?: Record<string, unknown>;
  isAnomaly?: boolean;
  anomalyType?: 'new_ip' | 'brute_force';
}

/**
 * 记录审计日志。永不抛出 -- 审计日志不能阻断业务流程。
 */
export async function recordAuditEvent(params: RecordAuditParams): Promise<void> {
  try {
    const ip = params.req.ip || '';
    const userAgent = params.req.get('user-agent') || '';

    await AuditLog.create({
      user: params.user ?? null,
      action: params.action,
      success: params.success,
      ip,
      userAgent,
      detail: params.detail,
      detailCode: params.detailCode,
      detailParams: params.detailParams,
      isAnomaly: params.isAnomaly ?? false,
      anomalyType: params.anomalyType,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('审计日志记录失败:', err);
  }
}
