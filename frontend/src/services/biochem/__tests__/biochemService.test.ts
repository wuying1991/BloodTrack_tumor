import biochemService, {
  BiochemTestFormData,
} from '../biochemService';
import type { BiochemTest } from '../../../types';

describe('biochemService.convertFormToApiData', () => {
  it('数字字段解析为 number，空字段不包含', () => {
    const formData: BiochemTestFormData = {
      date: '2026-07-18',
      alt: '45.5',
      ast: '30',
      cr: '',
      k: '4.2',
      notes: '',
      chemoCycleId: '',
    };
    const result = biochemService.convertFormToApiData(formData);
    expect(result.date).toBe('2026-07-18');
    expect(result.alt).toBe(45.5);
    expect(result.ast).toBe(30);
    expect(result.k).toBe(4.2);
    // 空/未填字段不应出现
    expect(result.cr).toBeUndefined();
    expect(result.notes).toBeUndefined();
    expect(result.chemoCycleId).toBeUndefined();
  });

  it('全部 25 数字字段都能正确转换', () => {
    const numericKeys = [
      'alt', 'ast', 'ahr', 'tbil', 'dbil', 'ibil', 'tp', 'alb', 'glo', 'ag',
      'ggt', 'alp', 'che', 'tba', 'pa', 'bun', 'cr', 'ua', 'egfr',
      'k', 'na', 'cl', 'ca', 'p', 'ldh',
    ];
    const formData = {
      date: '2026-07-18',
      notes: 'x',
      chemoCycleId: 'c1',
    } as BiochemTestFormData;
    numericKeys.forEach((k, i) => {
      (formData as unknown as Record<string, string>)[k] = String(i + 1);
    });
    const result = biochemService.convertFormToApiData(formData);
    numericKeys.forEach((k, i) => {
      expect(result[k as keyof typeof result]).toBe(i + 1);
    });
  });

  it('非数字字符串被忽略（parseFloat 失败）', () => {
    const formData = {
      date: '2026-07-18',
      alt: 'abc',
      notes: '',
      chemoCycleId: '',
    } as BiochemTestFormData;
    const result = biochemService.convertFormToApiData(formData);
    expect(result.alt).toBeUndefined();
  });

  it('notes 与 chemoCycleId 非空时保留', () => {
    const formData: BiochemTestFormData = {
      date: '2026-07-18',
      notes: '  术后复查  ',
      chemoCycleId: 'cycle-42',
    };
    const result = biochemService.convertFormToApiData(formData);
    expect(result.notes).toBe('术后复查');
    expect(result.chemoCycleId).toBe('cycle-42');
  });
});

describe('biochemService.convertApiToFormData', () => {
  it('数字转字符串，undefined 转空串，日期去掉 T 后缀', () => {
    const test = {
      _id: 'b1',
      userId: 'u1',
      date: '2026-07-18T00:00:00.000Z',
      alt: 45.5,
      ast: 30,
      cr: undefined,
      k: null,
      notes: '术后',
      chemoCycleId: 'c1',
      isAbnormal: true,
    } as unknown as BiochemTest;

    const formData = biochemService.convertApiToFormData(test);
    expect(formData.date).toBe('2026-07-18T00:00:00.000Z'.split('T')[0]);
    expect(formData.alt).toBe('45.5');
    expect(formData.ast).toBe('30');
    expect(formData.cr).toBe('');
    expect(formData.k).toBe('');
    expect(formData.notes).toBe('术后');
    expect(formData.chemoCycleId).toBe('c1');
  });

  it('notes 为 null 时返回空串', () => {
    const test = {
      _id: 'b2',
      userId: 'u2',
      date: '2026-07-18',
      notes: null,
      chemoCycleId: null,
    } as unknown as BiochemTest;
    const formData = biochemService.convertApiToFormData(test);
    expect(formData.notes).toBe('');
    expect(formData.chemoCycleId).toBe('');
  });

  it('convertFormToApiData 与 convertApiToFormData 互逆（数字字段）', () => {
    const original: BiochemTestFormData = {
      date: '2026-07-18',
      alt: '45.5',
      ast: '30',
      tbil: '18.2',
      alb: '40',
      notes: '复查',
      chemoCycleId: 'c1',
    };
    const apiData = biochemService.convertFormToApiData(original);
    const roundTrip = biochemService.convertApiToFormData(
      apiData as unknown as BiochemTest
    );
    expect(roundTrip.date).toBe('2026-07-18');
    expect(roundTrip.alt).toBe('45.5');
    expect(roundTrip.ast).toBe('30');
    expect(roundTrip.tbil).toBe('18.2');
    expect(roundTrip.alb).toBe('40');
    expect(roundTrip.notes).toBe('复查');
    expect(roundTrip.chemoCycleId).toBe('c1');
  });
});
