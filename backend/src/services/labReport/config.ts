/**
 * Lab-report vision multi-provider configuration (env-driven).
 *
 * Primary:
 *   LAB_REPORT_PROVIDER=mock|xai|openai|openai_compatible|tencent
 * Fallback chain (comma-separated, tried on failure):
 *   LAB_REPORT_FALLBACK=mock
 * Allow client to pick provider/model on each request (dev only recommended):
 *   LAB_REPORT_ALLOW_CLIENT_OVERRIDE=true
 *
 * xAI:
 *   XAI_API_KEY=...
 *   XAI_BASE_URL=https://api.x.ai/v1   (optional)
 *   XAI_VISION_MODEL=grok-4.5         (optional)
 *
 * OpenAI / any OpenAI-compatible vision endpoint:
 *   OPENAI_API_KEY=...   or LAB_REPORT_API_KEY=...
 *   LAB_REPORT_BASE_URL=https://api.openai.com/v1
 *   LAB_REPORT_MODEL=gpt-4o
 *
 * Tencent Cloud OCR:
 *   TENCENT_SECRET_ID=...
 *   TENCENT_SECRET_KEY=...
 *   TENCENT_OCR_REGION=ap-guangzhou
 */

export type ProviderKind =
  | 'mock'
  | 'xai'
  | 'openai'
  | 'openai_compatible'
  | 'tencent';

export interface LabReportEnvConfig {
  primary: string;
  fallbackChain: string[];
  allowClientOverride: boolean;
  xai: {
    apiKey?: string;
    baseUrl: string;
    model: string;
  };
  openai: {
    apiKey?: string;
    baseUrl: string;
    model: string;
  };
  tencent: {
    secretId?: string;
    secretKey?: string;
    region: string;
  };
}

function splitList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function resolveAllowClientOverride(): boolean {
  const raw = process.env.LAB_REPORT_ALLOW_CLIENT_OVERRIDE;
  const isProd = process.env.NODE_ENV === 'production';
  // Production: OFF unless explicitly true (prevents clients picking providers)
  if (isProd) {
    return raw === 'true';
  }
  // Dev/test: ON unless explicitly false (handy for miniapp model chips)
  return raw !== 'false';
}

export function loadLabReportConfig(): LabReportEnvConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const primary = (process.env.LAB_REPORT_PROVIDER || 'mock').toLowerCase();
  const fallbackChain = splitList(process.env.LAB_REPORT_FALLBACK);

  // Dev: default fall back to mock when primary fails and no chain set
  // Prod: do NOT auto-append mock (avoid silent demo data in production)
  if (
    fallbackChain.length === 0 &&
    primary !== 'mock' &&
    !isProd
  ) {
    fallbackChain.push('mock');
  }

  // Production safety: primary=mock is allowed for staging, but log a warning once
  if (isProd && primary === 'mock') {
    // eslint-disable-next-line no-console
    console.warn(
      '[lab-report] WARNING: LAB_REPORT_PROVIDER=mock in production — demo data only'
    );
  }

  if (isProd && resolveAllowClientOverride()) {
    // eslint-disable-next-line no-console
    console.warn(
      '[lab-report] WARNING: LAB_REPORT_ALLOW_CLIENT_OVERRIDE=true in production'
    );
  }

  return {
    primary,
    fallbackChain,
    allowClientOverride: resolveAllowClientOverride(),
    xai: {
      apiKey: process.env.XAI_API_KEY || process.env.LAB_REPORT_XAI_API_KEY,
      baseUrl: (process.env.XAI_BASE_URL || 'https://api.x.ai/v1').replace(
        /\/$/,
        ''
      ),
      model:
        process.env.XAI_VISION_MODEL ||
        process.env.LAB_REPORT_XAI_MODEL ||
        'grok-4.5',
    },
    openai: {
      apiKey:
        process.env.LAB_REPORT_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.LAB_REPORT_OPENAI_API_KEY,
      baseUrl: (
        process.env.LAB_REPORT_BASE_URL ||
        process.env.OPENAI_BASE_URL ||
        'https://api.openai.com/v1'
      ).replace(/\/$/, ''),
      model:
        process.env.LAB_REPORT_MODEL ||
        process.env.OPENAI_VISION_MODEL ||
        'gpt-4o',
    },
    tencent: {
      secretId:
        process.env.TENCENT_SECRET_ID ||
        process.env.LAB_REPORT_TENCENT_SECRET_ID,
      secretKey:
        process.env.TENCENT_SECRET_KEY ||
        process.env.LAB_REPORT_TENCENT_SECRET_KEY,
      region: process.env.TENCENT_OCR_REGION || 'ap-guangzhou',
    },
  };
}
