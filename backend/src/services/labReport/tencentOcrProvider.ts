import crypto from 'crypto';
import { extractMetricsFromText } from './textMetricExtract';
import type {
  LabReportParseInput,
  LabReportParseResult,
  LabReportProvider,
  LabReportProviderInfo,
} from './types';

export interface TencentOcrOptions {
  secretId?: string;
  secretKey?: string;
  region?: string;
  /** When true and no secrets: return structured stub error guidance only via parse throw */
  endpoint?: string;
}

/**
 * Tencent Cloud GeneralAccurateOCR + local rule extraction.
 *
 * Env:
 *   TENCENT_SECRET_ID / TENCENT_SECRET_KEY
 *   or LAB_REPORT_TENCENT_SECRET_ID / LAB_REPORT_TENCENT_SECRET_KEY
 *   TENCENT_OCR_REGION=ap-guangzhou (optional)
 *
 * Docs: https://cloud.tencent.com/document/product/866/33526
 */
export class TencentOcrLabReportProvider implements LabReportProvider {
  readonly id = 'tencent';
  readonly label = '腾讯云 OCR';
  private secretId?: string;
  private secretKey?: string;
  private region: string;
  private endpoint: string;

  constructor(opts: TencentOcrOptions = {}) {
    this.secretId = opts.secretId;
    this.secretKey = opts.secretKey;
    this.region = opts.region || 'ap-guangzhou';
    this.endpoint = opts.endpoint || 'ocr.tencentcloudapi.com';
  }

  info(): LabReportProviderInfo {
    return {
      id: this.id,
      label: this.label,
      configured: !!(this.secretId && this.secretKey),
      defaultModel: 'GeneralAccurateOCR',
      supportsImage: true,
      notes:
        '通用印刷体高精度 OCR + 本地规则映射指标。配置 TENCENT_SECRET_ID / TENCENT_SECRET_KEY',
    };
  }

  async parse(input: LabReportParseInput): Promise<LabReportParseResult> {
    if (!this.secretId || !this.secretKey) {
      throw new Error(
        '腾讯云 OCR 未配置：请设置 TENCENT_SECRET_ID 与 TENCENT_SECRET_KEY'
      );
    }
    if (!input.imageBase64 || input.imageBase64.length < 20) {
      throw new Error('腾讯云 OCR 需要上传化验单图片');
    }

    // Strip data-url prefix if present
    let imageBase64 = input.imageBase64;
    const dataUrl = imageBase64.match(/^data:[^;]+;base64,(.+)$/);
    if (dataUrl) imageBase64 = dataUrl[1];

    const texts = await this.callGeneralAccurateOcr(imageBase64);
    const joined = texts.join('\n');
    if (!joined.trim()) {
      throw new Error('腾讯云 OCR 未识别到文字');
    }

    const result = extractMetricsFromText(joined, {
      provider: 'tencent',
      model: 'GeneralAccurateOCR',
      reportHint: input.reportHint,
    });
    result.warnings = [
      ...(result.warnings || []),
      `OCR 共识别 ${texts.length} 行文本`,
    ];
    return result;
  }

  /** TC3-HMAC-SHA256 signed request */
  private async callGeneralAccurateOcr(imageBase64: string): Promise<string[]> {
    const service = 'ocr';
    const host = this.endpoint;
    const action = 'GeneralAccurateOCR';
    const version = '2018-11-19';
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

    const payload = JSON.stringify({ ImageBase64: imageBase64 });
    const hashedRequestPayload = sha256Hex(payload);

    const canonicalHeaders =
      `content-type:application/json; charset=utf-8\n` +
      `host:${host}\n` +
      `x-tc-action:${action.toLowerCase()}\n`;
    const signedHeaders = 'content-type;host;x-tc-action';

    const canonicalRequest = [
      'POST',
      '/',
      '',
      canonicalHeaders,
      signedHeaders,
      hashedRequestPayload,
    ].join('\n');

    const credentialScope = `${date}/${service}/tc3_request`;
    const stringToSign = [
      'TC3-HMAC-SHA256',
      String(timestamp),
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');

    const secretDate = hmac('TC3' + this.secretKey!, date);
    const secretService = hmac(secretDate, service);
    const secretSigning = hmac(secretService, 'tc3_request');
    const signature = hmac(secretSigning, stringToSign).toString('hex');

    const authorization =
      `TC3-HMAC-SHA256 Credential=${this.secretId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch(`https://${host}`, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json; charset=utf-8',
          Host: host,
          'X-TC-Action': action,
          'X-TC-Timestamp': String(timestamp),
          'X-TC-Version': version,
          'X-TC-Region': this.region,
        },
        body: payload,
        signal: controller.signal,
      });

      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || json?.Response?.Error) {
        const err = json?.Response?.Error;
        const msg =
          err?.Message ||
          json?.message ||
          `腾讯云 OCR HTTP ${res.status}`;
        const code = err?.Code ? ` [${err.Code}]` : '';
        throw new Error(`${msg}${code}`);
      }

      const items = json?.Response?.TextDetections || [];
      return items
        .map((t: any) => String(t?.DetectedText || '').trim())
        .filter(Boolean);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('腾讯云 OCR 请求超时');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function hmac(key: string | Buffer, msg: string): Buffer {
  return crypto.createHmac('sha256', key).update(msg, 'utf8').digest();
}
