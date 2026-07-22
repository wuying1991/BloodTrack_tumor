export type LabReportType = 'blood' | 'biochem' | 'unknown';

export type LabReportProviderId =
  | 'mock'
  | 'xai'
  | 'openai'
  | 'openai_compatible'
  | string;

export interface LabReportParseResult {
  provider: LabReportProviderId;
  /** Concrete model id when known (e.g. grok-4.5) */
  model?: string;
  reportType: LabReportType;
  /** YYYY-MM-DD if detected */
  date?: string;
  metrics: Record<string, number | undefined>;
  confidenceByKey: Record<string, number>;
  overallConfidence: number;
  warnings: string[];
  rawHints?: string[];
}

export interface LabReportParseInput {
  imageBase64?: string;
  mimeType?: string;
  reportHint?: LabReportType;
  /** Optional per-request model override (when allowed by config) */
  model?: string;
}

export interface LabReportProviderInfo {
  id: string;
  label: string;
  /** Whether credentials look present (no secret values returned) */
  configured: boolean;
  defaultModel?: string;
  supportsImage: boolean;
  notes?: string;
}

export interface LabReportProvider {
  readonly id: string;
  readonly label: string;
  info(): LabReportProviderInfo;
  parse(input: LabReportParseInput): Promise<LabReportParseResult>;
}
