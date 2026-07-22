import type { LabReportParseResult, LabReportProviderId, LabReportType } from './types';
import { stripCodeFence } from './prompt';

const METRIC_KEYS = [
  'wbc',
  'rbc',
  'hgb',
  'plt',
  'neu',
  'lym',
  'crp',
  'alt',
  'ast',
  'crea',
  'ua',
  'k',
  'na',
] as const;

function asNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  if (Number.isNaN(n) || !Number.isFinite(n)) return undefined;
  return n;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Parse model text → LabReportParseResult (throws if unusable).
 */
export function normalizeModelJson(
  rawText: string,
  meta: { provider: LabReportProviderId; model?: string }
): LabReportParseResult {
  const cleaned = stripCodeFence(rawText);
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // try to extract first {...}
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } else {
      throw new Error('模型返回的不是合法 JSON');
    }
  }

  const reportType: LabReportType =
    parsed.reportType === 'blood' ||
    parsed.reportType === 'biochem' ||
    parsed.reportType === 'unknown'
      ? parsed.reportType
      : 'unknown';

  const metrics: Record<string, number | undefined> = {};
  const confidenceByKey: Record<string, number> = {};
  const srcMetrics = parsed.metrics || {};
  const srcConf = parsed.confidenceByKey || {};

  for (const key of METRIC_KEYS) {
    const n = asNumber(srcMetrics[key]);
    if (n !== undefined) metrics[key] = n;
    const c = asNumber(srcConf[key]);
    if (c !== undefined) confidenceByKey[key] = clamp01(c);
  }

  let date: string | undefined;
  if (typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    date = parsed.date;
  }

  const overall =
    asNumber(parsed.overallConfidence) ??
    (Object.keys(confidenceByKey).length
      ? Object.values(confidenceByKey).reduce((a, b) => a + b, 0) /
        Object.values(confidenceByKey).length
      : 0.5);

  const warnings = Array.isArray(parsed.warnings)
    ? parsed.warnings.map(String)
    : [];
  const rawHints = Array.isArray(parsed.rawHints)
    ? parsed.rawHints.map(String)
    : undefined;

  if (Object.keys(metrics).length === 0) {
    warnings.push('未识别到可用数值指标，请改用手填');
  }

  return {
    provider: meta.provider,
    model: meta.model,
    reportType,
    date,
    metrics,
    confidenceByKey,
    overallConfidence: clamp01(overall),
    warnings,
    rawHints,
  };
}
