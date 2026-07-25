import { buildExtractionPrompt } from './prompt';
import { normalizeModelJson } from './normalize';
import type {
  LabReportParseInput,
  LabReportParseResult,
  LabReportProvider,
  LabReportProviderInfo,
} from './types';

export interface XaiProviderOptions {
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
}

/**
 * xAI vision via Responses API (docs.x.ai image understanding).
 * Falls back message is handled by registry fallback chain.
 */
export class XaiLabReportProvider implements LabReportProvider {
  readonly id = 'xai';
  readonly label = 'xAI Grok Vision';
  private apiKey?: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(opts: XaiProviderOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.defaultModel = opts.defaultModel;
  }

  info(): LabReportProviderInfo {
    return {
      id: this.id,
      label: this.label,
      configured: !!this.apiKey,
      defaultModel: this.defaultModel,
      supportsImage: true,
      notes: '使用 XAI_API_KEY + Responses API（input_image）',
    };
  }

  async parse(input: LabReportParseInput): Promise<LabReportParseResult> {
    if (!this.apiKey) {
      throw new Error('xAI 未配置 XAI_API_KEY');
    }
    if (!input.imageBase64 || input.imageBase64.length < 20) {
      throw new Error('xAI 识别需要上传化验单图片');
    }

    const model = input.model?.trim() || this.defaultModel;
    const mime = input.mimeType || 'image/jpeg';
    const dataUrl = input.imageBase64.startsWith('data:')
      ? input.imageBase64
      : `data:${mime};base64,${input.imageBase64}`;

    const prompt = buildExtractionPrompt(input.reportHint || 'blood');
    const url = `${this.baseUrl}/responses`;

    const body = {
      model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: dataUrl,
              detail: 'high',
            },
            {
              type: 'input_text',
              text: prompt,
            },
          ],
        },
      ],
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);

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
          `xAI HTTP ${res.status}`;
        throw new Error(msg);
      }

      // Prefer SDK-style output_text if present; else walk output content
      let text =
        typeof json.output_text === 'string' ? json.output_text : '';

      if (!text && Array.isArray(json.output)) {
        const parts: string[] = [];
        for (const item of json.output) {
          const content = item?.content;
          if (Array.isArray(content)) {
            for (const c of content) {
              if (typeof c?.text === 'string') parts.push(c.text);
              if (typeof c?.output_text === 'string') parts.push(c.output_text);
            }
          }
        }
        text = parts.join('\n');
      }

      // Chat-completions shaped fallback if gateway remaps
      if (!text && json?.choices?.[0]?.message?.content) {
        text = String(json.choices[0].message.content);
      }

      if (!text) {
        throw new Error('xAI 未返回可解析文本');
      }

      return normalizeModelJson(text, { provider: 'xai', model });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('xAI 请求超时');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
