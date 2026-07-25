import type { LabReportParseResult, LabReportType } from './types';

/**
 * Rule-based extraction from OCR plain text lines.
 * Used by Tencent OCR (and future pure-OCR providers).
 */

type MetricKey =
  | 'wbc'
  | 'rbc'
  | 'hgb'
  | 'plt'
  | 'neu'
  | 'lym'
  | 'crp'
  | 'alt'
  | 'ast'
  | 'crea'
  | 'ua'
  | 'k'
  | 'na';

interface PatternDef {
  key: MetricKey;
  /** match Chinese / English names near a number */
  patterns: RegExp[];
  /** post-process value (e.g. g/dL → g/L) */
  transform?: (n: number, raw: string) => number;
}

const PATTERNS: PatternDef[] = [
  {
    key: 'wbc',
    patterns: [
      /白\s*细\s*胞(?:计数)?[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bWBC\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
    ],
  },
  {
    key: 'rbc',
    patterns: [
      /红\s*细\s*胞(?:计数)?[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bRBC\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
    ],
  },
  {
    key: 'hgb',
    patterns: [
      /血\s*红\s*蛋\s*白[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bHGB\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bHb\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
    ],
    transform: (n, raw) => {
      // if unit looks like g/dL and value is small, convert
      if (/g\s*\/\s*dL|g\/dl/i.test(raw) && n < 30) return n * 10;
      return n;
    },
  },
  {
    key: 'plt',
    patterns: [
      /血\s*小\s*板[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bPLT\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
    ],
  },
  {
    key: 'neu',
    patterns: [
      /中\s*性\s*粒(?:细胞)?(?:计数|绝对值)?[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bNEU(?:T)?\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bANC\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
    ],
  },
  {
    key: 'lym',
    patterns: [
      /淋\s*巴\s*细\s*胞(?:计数|绝对值)?[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bLYM(?:#)?\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
    ],
  },
  {
    key: 'crp',
    patterns: [
      /[Cc]\s*反\s*应\s*蛋\s*白[^0-9]{0,12}([0-9]+\.?[0-9]*)/,
      /\bCRP\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
    ],
  },
  {
    key: 'alt',
    patterns: [
      /谷\s*丙(?:转氨酶)?[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bALT\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
    ],
  },
  {
    key: 'ast',
    patterns: [
      /谷\s*草(?:转氨酶)?[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bAST\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
    ],
  },
  {
    key: 'crea',
    patterns: [
      /肌\s*酐[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bCREA(?:TININE)?\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bCr\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/,
    ],
  },
  {
    key: 'ua',
    patterns: [
      /尿\s*酸[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
      /\bUA\b[^0-9]{0,12}([0-9]+\.?[0-9]*)/i,
    ],
  },
  {
    key: 'k',
    patterns: [
      /钾(?:离子)?[^0-9]{0,12}([0-9]+\.?[0-9]*)/,
      /\bK\+?\b[^0-9]{0,8}([0-9]+\.?[0-9]*)/,
    ],
  },
  {
    key: 'na',
    patterns: [
      /钠(?:离子)?[^0-9]{0,12}([0-9]+\.?[0-9]*)/,
      /\bNa\+?\b[^0-9]{0,8}([0-9]+\.?[0-9]*)/,
    ],
  },
];

const BLOOD_KEYS = new Set(['wbc', 'rbc', 'hgb', 'plt', 'neu', 'lym', 'crp']);
const BIOCHEM_KEYS = new Set(['alt', 'ast', 'crea', 'ua', 'k', 'na']);

function extractDate(text: string): string | undefined {
  const m =
    text.match(
      /(20\d{2})[年./-](\d{1,2})[月./-](\d{1,2})/
    ) || text.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (!m) return undefined;
  const y = m[1];
  const mo = m[2].padStart(2, '0');
  const d = m[3].padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

export function extractMetricsFromText(
  text: string,
  meta: {
    provider: string;
    model?: string;
    reportHint?: LabReportType;
  }
): LabReportParseResult {
  const flat = text.replace(/\s+/g, ' ');
  const metrics: Record<string, number | undefined> = {};
  const confidenceByKey: Record<string, number> = {};
  const rawHints: string[] = [];

  for (const def of PATTERNS) {
    for (const re of def.patterns) {
      const m = flat.match(re);
      if (!m) continue;
      let n = Number(m[1]);
      if (Number.isNaN(n)) continue;
      if (def.transform) n = def.transform(n, m[0]);
      metrics[def.key] = n;
      confidenceByKey[def.key] = 0.72; // OCR+rule baseline
      rawHints.push(m[0].trim().slice(0, 80));
      break;
    }
  }

  const bloodHits = Object.keys(metrics).filter((k) => BLOOD_KEYS.has(k)).length;
  const biochemHits = Object.keys(metrics).filter((k) =>
    BIOCHEM_KEYS.has(k)
  ).length;

  let reportType: LabReportType = 'unknown';
  if (meta.reportHint === 'blood' || meta.reportHint === 'biochem') {
    reportType = meta.reportHint;
  } else if (bloodHits >= biochemHits && bloodHits > 0) {
    reportType = 'blood';
  } else if (biochemHits > 0) {
    reportType = 'biochem';
  }

  const confs = Object.values(confidenceByKey);
  const overall =
    confs.length > 0
      ? confs.reduce((a, b) => a + b, 0) / confs.length
      : 0.2;

  const warnings = [
    '结果来自 OCR 文本规则抽取，准确率依赖单据版式，请务必人工核对。',
  ];
  if (Object.keys(metrics).length === 0) {
    warnings.push('未从 OCR 文本中匹配到已知指标，请改用手填或切换视觉大模型。');
  }

  return {
    provider: meta.provider,
    model: meta.model,
    reportType,
    date: extractDate(flat),
    metrics,
    confidenceByKey,
    overallConfidence: Math.round(overall * 100) / 100,
    warnings,
    rawHints: rawHints.slice(0, 12),
  };
}
