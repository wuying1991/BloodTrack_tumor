import { buildExtractionPrompt } from './prompt';
import { normalizeModelJson } from './normalize';
import type {
  LabReportParseInput,
  LabReportParseResult,
  LabReportProvider,
  LabReportProviderInfo,
} from './types';

export interface OpenAICompatibleOptions {
  id: string;
  label: string;
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
  notes?: string;
}

/**
 * Vision via OpenAI-compatible Chat Completions API
 * (works for OpenAI, many gateways, and some xAI chat endpoints).
 */
export class OpenAICompatibleLabReportProvider implements LabReportProvider {
  readonly id: string;
  readonly label: string;
  private apiKey?: string;
  private baseUrl: string;
  private defaultModel: string;
  private notes?: string;

  constructor(opts: OpenAICompatibleOptions) {
    this.id = opts.id;
    this.label = opts.label;
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.defaultModel = opts.defaultModel;
    this.notes = opts.notes;
  }

  info(): LabReportProviderInfo {
    return {
      id: this.id,
      label: this.label,
      configured: !!this.apiKey,
      defaultModel: this.defaultModel,
      supportsImage: true,
      notes: this.notes,
    };
  }

  async parse(input: LabReportParseInput): Promise<LabReportParseResult> {
    if (!this.apiKey) {
      throw new Error(`${this.label} 未配置 API Key`);
    }
    if (!input.imageBase64 || input.imageBase64.length < 20) {
      throw new Error(`${this.label} 需要上传化验单图片`);
    }

    const model = input.model?.trim() || this.defaultModel;
    const mime = input.mimeType || 'image/jpeg';
    const dataUrl = input.imageBase64.startsWith('data:')
      ? input.imageBase64
      : `data:${mime};base64,${input.imageBase64}`;

    const prompt = buildExtractionPrompt(input.reportHint || 'blood');

    const url = `${this.baseUrl}/chat/completions`;
    const body = {
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        const msg =
          json?.error?.message ||
          json?.message ||
          `HTTP ${res.status} from ${this.id}`;
        throw new Error(msg);
      }

      const text =
        json?.choices?.[0]?.message?.content ||
        json?.choices?.[0]?.message?.content?.[0]?.text ||
        '';

      if (!text || typeof text !== 'string') {
        // Some gateways return structured content arrays
        const content = json?.choices?.[0]?.message?.content;
        if (Array.isArray(content)) {
          const joined = content
            .map((c: any) => c?.text || c?.content || '')
            .join('\n');
          if (joined) {
            return normalizeModelJson(joined, {
              provider: this.id,
              model,
            });
          }
        }
        throw new Error(`${this.label} 未返回文本结果`);
      }

      return normalizeModelJson(text, { provider: this.id, model });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`${this.label} 请求超时`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
