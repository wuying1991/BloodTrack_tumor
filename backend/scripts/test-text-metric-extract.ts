/**
 * Quick self-check for OCR rule extraction (no network).
 *   npx ts-node scripts/test-text-metric-extract.ts
 */
import { extractMetricsFromText } from '../src/services/labReport/textMetricExtract';

const sample = `
某某医院 血常规报告
检测日期：2026年07月15日
白细胞计数 WBC 4.80 ×10^9/L
红细胞计数 RBC 4.21 ×10^12/L
血红蛋白 HGB 112 g/L
血小板 PLT 168 ×10^9/L
中性粒细胞 NEU 2.90
淋巴细胞 LYM 1.52
`;

const r = extractMetricsFromText(sample, {
  provider: 'test',
  model: 'rules',
  reportHint: 'blood',
});

console.log(JSON.stringify(r, null, 2));
if (!r.metrics.wbc || !r.metrics.hgb) {
  console.error('FAIL: expected wbc/hgb');
  process.exit(1);
}
console.log('OK');
