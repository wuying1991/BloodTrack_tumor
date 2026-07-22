import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import asyncHandler from '../utils/asyncHandler';
import { getLabReportService } from '../services/labReport/registry';
import type { LabReportType } from '../services/labReport/types';
import {
  MAX_LAB_IMAGE_BASE64_CHARS,
  redactErrorMessage,
  safeLogMeta,
} from '../utils/redact';

/**
 * Lab report photo parse — multi vision-provider.
 * Recognition never writes to DB; client confirms via create APIs.
 *
 * Secrets stay server-side. Client may only pass provider/model when
 * LAB_REPORT_ALLOW_CLIENT_OVERRIDE is enabled (forced off in production unless explicit).
 */

function asReportHint(v: unknown): LabReportType {
  if (v === 'blood' || v === 'biochem' || v === 'unknown') return v;
  return 'blood';
}

/**
 * GET /api/lab-reports/providers
 * List configured vision backends (no secrets).
 */
export const listLabReportProviders = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未授权' });
      return;
    }
    const service = getLabReportService();
    res.status(200).json({
      success: true,
      data: service.getConfigSummary(),
    });
  }
);

/**
 * POST /api/lab-reports/parse
 */
export const parseLabReport = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未授权' });
      return;
    }

    const reportHint = asReportHint(req.body?.reportHint);
    const imageBase64 =
      typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : undefined;
    const mimeType =
      typeof req.body?.mimeType === 'string' ? req.body.mimeType : undefined;
    const requestedProvider =
      typeof req.body?.provider === 'string' ? req.body.provider : undefined;
    const requestedModel =
      typeof req.body?.model === 'string' ? req.body.model : undefined;

    if (imageBase64 && imageBase64.length > MAX_LAB_IMAGE_BASE64_CHARS) {
      res.status(413).json({
        success: false,
        message: '图片过大，请压缩后重试（建议 2MB 以内）',
        code: 'LAB_REPORT_IMAGE_TOO_LARGE',
      });
      return;
    }

    // Soft guard: only image/* mime types when provided
    if (
      mimeType &&
      !/^image\/(jpeg|jpg|png|webp|gif|bmp)$/i.test(mimeType) &&
      mimeType !== 'application/octet-stream'
    ) {
      res.status(400).json({
        success: false,
        message: '仅支持图片格式（jpeg/png/webp）',
        code: 'LAB_REPORT_INVALID_MIME',
      });
      return;
    }

    try {
      const service = getLabReportService();
      const data = await service.parse(
        { imageBase64, mimeType, reportHint },
        { requestedProvider, requestedModel }
      );

      // Audit-friendly log without secrets / image bytes
      // eslint-disable-next-line no-console
      console.info(
        '[lab-report] parse ok',
        safeLogMeta({
          userId: String(req.user._id),
          provider: data.provider,
          model: data.model,
          reportType: data.reportType,
          metricCount: Object.keys(data.metrics || {}).length,
          tried: data.triedProviders?.join(','),
          hasImage: !!imageBase64,
        })
      );

      res.status(200).json({ success: true, data });
    } catch (err: unknown) {
      const message = redactErrorMessage(err);
      // eslint-disable-next-line no-console
      console.warn(
        '[lab-report] parse failed',
        safeLogMeta({
          userId: String(req.user._id),
          reportHint,
          hasImage: !!imageBase64,
          error: message,
        })
      );
      res.status(502).json({
        success: false,
        message: message || '化验单识别失败',
        code: 'LAB_REPORT_PARSE_FAILED',
      });
    }
  }
);
