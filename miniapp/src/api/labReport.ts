import { http } from '@/api/http';
import type { ApiSuccess } from '@/types/api';
import type {
  LabReportConfigSummary,
  LabReportParsePayload,
  LabReportParseResult,
} from '@/types/labReport';

/**
 * Parse lab-report photo → structured metrics.
 * Does NOT save records — caller must prefill form and user confirms.
 */
export async function parseLabReport(
  payload: LabReportParsePayload
): Promise<LabReportParseResult> {
  const res = await http.post<ApiSuccess<LabReportParseResult>>(
    '/lab-reports/parse',
    payload
  );
  return res.data;
}

/** List vision providers + active server config (no secrets). */
export async function listLabReportProviders(): Promise<LabReportConfigSummary> {
  const res = await http.get<ApiSuccess<LabReportConfigSummary>>(
    '/lab-reports/providers'
  );
  return res.data;
}
