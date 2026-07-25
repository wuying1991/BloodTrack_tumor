import { redactErrorMessage } from '../../utils/redact';
import { loadLabReportConfig, type LabReportEnvConfig } from './config';
import { MockLabReportProvider } from './mockProvider';
import { OpenAICompatibleLabReportProvider } from './openaiCompatibleProvider';
import { TencentOcrLabReportProvider } from './tencentOcrProvider';
import { XaiLabReportProvider } from './xaiProvider';
import type {
  LabReportParseInput,
  LabReportParseResult,
  LabReportProvider,
  LabReportProviderInfo,
} from './types';

function buildRegistry(cfg: LabReportEnvConfig): Map<string, LabReportProvider> {
  const map = new Map<string, LabReportProvider>();

  const mock = new MockLabReportProvider();
  map.set(mock.id, mock);

  const xai = new XaiLabReportProvider({
    apiKey: cfg.xai.apiKey,
    baseUrl: cfg.xai.baseUrl,
    defaultModel: cfg.xai.model,
  });
  map.set(xai.id, xai);

  // OpenAI official-style id
  const openai = new OpenAICompatibleLabReportProvider({
    id: 'openai',
    label: 'OpenAI Vision',
    apiKey: cfg.openai.apiKey,
    baseUrl: cfg.openai.baseUrl,
    defaultModel: cfg.openai.model,
    notes: 'OPENAI_API_KEY 或 LAB_REPORT_API_KEY + LAB_REPORT_BASE_URL',
  });
  map.set(openai.id, openai);

  // Alias for custom OpenAI-compatible gateways
  const compatible = new OpenAICompatibleLabReportProvider({
    id: 'openai_compatible',
    label: 'OpenAI-Compatible Vision',
    apiKey: cfg.openai.apiKey,
    baseUrl: cfg.openai.baseUrl,
    defaultModel: cfg.openai.model,
    notes: '任意兼容 /v1/chat/completions 的视觉网关',
  });
  map.set(compatible.id, compatible);

  const tencent = new TencentOcrLabReportProvider({
    secretId: cfg.tencent.secretId,
    secretKey: cfg.tencent.secretKey,
    region: cfg.tencent.region,
  });
  map.set(tencent.id, tencent);

  return map;
}

export interface ResolveParseOptions {
  /** Request body provider override */
  requestedProvider?: string;
  requestedModel?: string;
}

export class LabReportService {
  private cfg: LabReportEnvConfig;
  private providers: Map<string, LabReportProvider>;

  constructor(cfg?: LabReportEnvConfig) {
    this.cfg = cfg || loadLabReportConfig();
    this.providers = buildRegistry(this.cfg);
  }

  /** Reload env (e.g. tests). */
  reload(): void {
    this.cfg = loadLabReportConfig();
    this.providers = buildRegistry(this.cfg);
  }

  listProviders(): LabReportProviderInfo[] {
    return Array.from(this.providers.values()).map((p) => p.info());
  }

  getConfigSummary() {
    return {
      primary: this.cfg.primary,
      fallbackChain: this.cfg.fallbackChain,
      allowClientOverride: this.cfg.allowClientOverride,
      providers: this.listProviders(),
    };
  }

  getProvider(id: string): LabReportProvider | undefined {
    return this.providers.get(id.toLowerCase());
  }

  /**
   * Try primary (or override) then fallback chain.
   */
  async parse(
    input: LabReportParseInput,
    opts: ResolveParseOptions = {}
  ): Promise<LabReportParseResult & { triedProviders: string[] }> {
    const chain: string[] = [];
    const primary =
      this.cfg.allowClientOverride && opts.requestedProvider
        ? opts.requestedProvider.toLowerCase()
        : this.cfg.primary;

    chain.push(primary);
    for (const fb of this.cfg.fallbackChain) {
      if (!chain.includes(fb)) chain.push(fb);
    }
    // Dev last-resort mock; production only if explicitly in fallback chain
    if (
      process.env.NODE_ENV !== 'production' &&
      !chain.includes('mock')
    ) {
      chain.push('mock');
    }

    const model =
      this.cfg.allowClientOverride && opts.requestedModel
        ? opts.requestedModel
        : input.model;

    const tried: string[] = [];
    const errors: string[] = [];

    for (const id of chain) {
      const provider = this.providers.get(id);
      if (!provider) {
        errors.push(`${id}: 未知 provider`);
        continue;
      }
      tried.push(id);
      try {
        const result = await provider.parse({ ...input, model });
        if (tried.length > 1) {
          result.warnings = [
            ...(result.warnings || []),
            `已使用回退链路：${tried.join(' → ')}（成功：${id}）`,
          ];
        }
        return { ...result, triedProviders: tried };
      } catch (err: unknown) {
        const msg = redactErrorMessage(err);
        errors.push(`${id}: ${msg}`);
        // eslint-disable-next-line no-console
        console.warn(`[lab-report] provider=${id} failed: ${msg}`);
      }
    }

    throw new Error(
      `所有视觉模型均失败：${errors.join(' | ') || '无可用 provider'}`
    );
  }
}

/** Process-wide singleton */
let singleton: LabReportService | null = null;

export function getLabReportService(): LabReportService {
  if (!singleton) singleton = new LabReportService();
  return singleton;
}
