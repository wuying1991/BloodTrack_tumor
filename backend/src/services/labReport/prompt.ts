import type { LabReportType } from './types';

/** Shared system/user prompt for vision models → strict JSON metrics. */
export function buildExtractionPrompt(reportHint: LabReportType = 'blood'): string {
  const hint =
    reportHint === 'biochem'
      ? '优先识别生化指标（肝功能 ALT/AST、肾功能 CREA/UA、电解质 K/Na 等）'
      : reportHint === 'blood'
        ? '优先识别血常规（WBC/RBC/HGB/PLT/NEU/LYM/CRP）'
        : '自动判断是血常规还是生化';

  return `你是医疗化验单结构化助手。${hint}。
从图片中的中文/英文化验单提取指标，只输出一个 JSON 对象，不要 markdown 代码块，不要解释。

JSON 格式：
{
  "reportType": "blood" | "biochem" | "unknown",
  "date": "YYYY-MM-DD 或 null",
  "metrics": {
    "wbc": number|null,
    "rbc": number|null,
    "hgb": number|null,
    "plt": number|null,
    "neu": number|null,
    "lym": number|null,
    "crp": number|null,
    "alt": number|null,
    "ast": number|null,
    "crea": number|null,
    "ua": number|null,
    "k": number|null,
    "na": number|null
  },
  "confidenceByKey": { "wbc": 0.0-1.0, ... 仅对识别到的字段 },
  "overallConfidence": 0.0-1.0,
  "rawHints": ["原文片段..."],
  "warnings": ["单位不确定等说明"]
}

规则：
1. 数值必须是数字，不要带单位字符串。
2. 血红蛋白优先用 g/L（若单据是 g/dL 请换算为 g/L：×10）。
3. 看不清的字段填 null，不要编造。
4. reportType 与实际指标一致。`;
}

export function stripCodeFence(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return m ? m[1].trim() : t;
}
