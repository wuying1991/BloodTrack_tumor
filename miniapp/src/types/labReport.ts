export type LabReportType = 'blood' | 'biochem' | 'unknown';

export interface LabReportParseResult {
  provider: string;
  model?: string;
  reportType: LabReportType;
  /** YYYY-MM-DD */
  date?: string;
  metrics: Record<string, number | undefined>;
  confidenceByKey: Record<string, number>;
  overallConfidence: number;
  warnings: string[];
  rawHints?: string[];
  /** providers attempted when fallback ran */
  triedProviders?: string[];
}

export interface LabReportParsePayload {
  imageBase64?: string;
  mimeType?: string;
  reportHint?: LabReportType;
  /** When server allows override (dev) */
  provider?: string;
  model?: string;
}

export interface LabReportProviderInfo {
  id: string;
  label: string;
  configured: boolean;
  defaultModel?: string;
  supportsImage: boolean;
  notes?: string;
}

export interface LabReportConfigSummary {
  primary: string;
  fallbackChain: string[];
  allowClientOverride: boolean;
  providers: LabReportProviderInfo[];
}
