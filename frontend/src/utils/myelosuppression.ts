export interface MyelosuppressionGrade {
  grade: number;
  label: string;
  className: string;
  description: string;
  guidelines: string[];
}

/**
 * 根据中性粒细胞绝对值 (NEU/ANC) 判定骨髓抑制 (中性粒细胞减少) 分级 (WHO/NCI-CTC 标准)
 * NEU 单位通常为 ×10⁹/L
 */
export function getMyelosuppressionGrade(
  neu: number | string | undefined | null
): MyelosuppressionGrade | null {
  if (neu === undefined || neu === null) return null;
  const val = typeof neu === 'string' ? parseFloat(neu) : neu;
  if (isNaN(val) || val < 0) return null;

  if (val >= 2.0) {
    return {
      grade: 0,
      label: '正常',
      className: 'grade-0',
      description: '中性粒细胞数值处于成人正常参考区间内。',
      guidelines: ['保持规律作息与均衡营养即可。'],
    };
  }

  if (val >= 1.5) {
    return {
      grade: 1,
      label: '1 级 (轻度)',
      className: 'grade-1',
      description: '轻度中性粒细胞减少（ANC 1.5 ~ 1.99 ×10⁹/L）。',
      guidelines: [
        '注意个人卫生，饭前便后使用抑菌洗手液洗手。',
        '开始关注体温，若体温超过 38℃ 请联系医生。',
      ],
    };
  }

  if (val >= 1.0) {
    return {
      grade: 2,
      label: '2 级 (中度)',
      className: 'grade-2',
      description: '中度中性粒细胞减少（ANC 1.0 ~ 1.49 ×10⁹/L）。',
      guidelines: [
        '避免前往人群拥挤的公共场所，外出必须佩戴医用外科口罩。',
        '严禁食用未彻底熟透的食物、剩饭菜以及未剥皮的水果。',
        '每日早晚各测一次体温，并做好记录。',
      ],
    };
  }

  if (val >= 0.5) {
    return {
      grade: 3,
      label: '3 级 (重度)',
      className: 'grade-3',
      description:
        '重度中性粒细胞减少（ANC 0.5 ~ 0.99 ×10⁹/L）。免疫防御低下，属高风险期。',
      guidelines: [
        '极易发生继发感染，应尽量单人单间居住并限制探视。',
        '严格执行无菌饮食，餐具每次使用前需煮沸消毒。',
        '密切监测体温。主治医生可能会建议注射升白针（G-CSF）。',
      ],
    };
  }

  return {
    grade: 4,
    label: '4 级 (极重度)',
    className: 'grade-4',
    description:
      '极重度中性粒细胞减少（ANC < 0.5 ×10⁹/L）。免疫系统极度脆弱，随时可能发生致命感染。',
    guidelines: [
      '🔴 粒缺危急状态！随时可能突发粒缺发热（Febrile Neutropenia）。',
      '请立即与主治医生联系或前往急诊。可能需要立刻入院隔离治疗。',
      '绝对避免接触任何感冒或有传染性疾病的人员。',
    ],
  };
}
export type MyelosuppressionGradeResult = ReturnType<
  typeof getMyelosuppressionGrade
>;
