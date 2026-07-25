import type {
  LabReportParseInput,
  LabReportParseResult,
  LabReportProvider,
  LabReportProviderInfo,
} from './types';

function daysAgoIsoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export class MockLabReportProvider implements LabReportProvider {
  readonly id = 'mock';
  readonly label = 'Mock 演示';

  info(): LabReportProviderInfo {
    return {
      id: this.id,
      label: this.label,
      configured: true,
      defaultModel: 'mock-v1',
      supportsImage: false,
      notes: '固定返回演示数据，用于 UI 联调；不调用外部模型',
    };
  }

  async parse(input: LabReportParseInput): Promise<LabReportParseResult> {
    await new Promise((r) => setTimeout(r, 400));

    const hasImage =
      typeof input.imageBase64 === 'string' && input.imageBase64.length > 20;

    if (input.reportHint === 'biochem') {
      return {
        provider: 'mock',
        model: 'mock-v1',
        reportType: 'biochem',
        date: daysAgoIsoDate(3),
        metrics: {
          alt: 28,
          ast: 24,
          crea: 72,
          ua: 310,
          k: 4.1,
          na: 140,
        },
        confidenceByKey: {
          alt: 0.9,
          ast: 0.88,
          crea: 0.86,
          ua: 0.8,
          k: 0.85,
          na: 0.87,
        },
        overallConfidence: 0.86,
        warnings: [
          '当前为 Mock 生化识别结果。',
          '请逐项核对后再保存，识别结果不会自动入库。',
        ],
        rawHints: ['ALT 28', 'AST 24', '肌酐 72'],
      };
    }

    const result: LabReportParseResult = {
      provider: 'mock',
      model: 'mock-v1',
      reportType: 'blood',
      date: daysAgoIsoDate(2),
      metrics: {
        wbc: 4.8,
        rbc: 4.21,
        hgb: 112,
        plt: 168,
        neu: 2.9,
        lym: 1.52,
      },
      confidenceByKey: {
        wbc: 0.93,
        rbc: 0.88,
        hgb: 0.95,
        plt: 0.91,
        neu: 0.84,
        lym: 0.81,
      },
      overallConfidence: 0.89,
      warnings: [
        '当前为 Mock 识别结果，仅用于联调 UI。',
        '请逐项核对后再保存，识别结果不会自动入库。',
      ],
      rawHints: [
        '白细胞(WBC) 4.8 ×10^9/L',
        '红细胞(RBC) 4.21 ×10^12/L',
        '血红蛋白(HGB) 112 g/L',
        '血小板(PLT) 168 ×10^9/L',
        '中性粒细胞(NEU) 2.9 ×10^9/L',
        '淋巴细胞(LYM) 1.52 ×10^9/L',
      ],
    };

    if (!hasImage) {
      result.warnings = [
        ...result.warnings,
        '未收到图片字节，仍返回演示数据（方便无图调试）。',
      ];
    }

    return result;
  }
}
