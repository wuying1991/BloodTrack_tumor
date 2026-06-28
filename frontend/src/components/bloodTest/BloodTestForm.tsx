import React, { useState, useEffect } from 'react';
import { BloodTest } from '../../types';
import bloodTestService, {
  BloodTestFormData,
} from '../../services/bloodTest/bloodTestService';
import chemoCycleService, {
  ChemoCycle,
} from '../../services/chemoCycle/chemoCycleService';
import { ApiError } from '../../services/api/apiClient';
import { getMyelosuppressionGrade } from '../../utils/myelosuppression';
import './BloodTestForm.css';

// Normal ranges for adult reference
const NORMAL_RANGES = {
  wbc: { min: 4.0, max: 10.0, unit: '×10⁹/L', name: '白细胞 (WBC)' },
  rbc: { min: 3.5, max: 5.8, unit: '×10¹²/L', name: '红细胞 (RBC)' },
  hgb: { min: 110, max: 165, unit: 'g/L', name: '血红蛋白 (HGB)' },
  plt: { min: 100, max: 300, unit: '×10⁹/L', name: '血小板 (PLT)' },
  neu: { min: 1.8, max: 6.3, unit: '×10⁹/L', name: '中性粒细胞 (NEU)' },
  lym: { min: 1.0, max: 4.8, unit: '×10⁹/L', name: '淋巴细胞 (LYM)' },
};

interface FormField {
  value: string;
  error?: string;
  warning?: string;
  touched: boolean;
}

type FormFields = {
  [K in keyof BloodTestFormData]: FormField;
};

interface BloodTestFormProps {
  initialData?: BloodTest;
  onSubmitSuccess: () => void;
  onCancel?: () => void;
  beforeSubmit?: (data: BloodTestFormData) => Promise<'continue' | 'cancel'>;
}

const BloodTestForm: React.FC<BloodTestFormProps> = ({
  initialData,
  onSubmitSuccess,
  onCancel,
  beforeSubmit,
}) => {
  const isEditing = !!initialData;

  const [formData, setFormData] = useState<FormFields>({
    date: { value: '', touched: false },
    wbc: { value: '', touched: false },
    rbc: { value: '', touched: false },
    hgb: { value: '', touched: false },
    plt: { value: '', touched: false },
    neu: { value: '', touched: false },
    lym: { value: '', touched: false },
    notes: { value: '', touched: false },
    chemoCycleId: { value: '', touched: false },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formLevelWarning, setFormLevelWarning] = useState('');
  const [cycles, setCycles] = useState<ChemoCycle[]>([]);

  // 加载所有化疗周期供选择（一次性即可，数量不会大）
  useEffect(() => {
    let mounted = true;
    chemoCycleService
      .getChemoCycles(1, 100)
      .then(res => {
        if (mounted) setCycles(res.data || []);
      })
      .catch(() => {
        // 周期加载失败不阻塞表单
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Initialize form with existing data if editing
  useEffect(() => {
    if (initialData) {
      const formValues = bloodTestService.convertApiToFormData(initialData);
      const newFormData: FormFields = {
        date: { value: formValues.date, touched: false },
        wbc: { value: formValues.wbc, touched: false },
        rbc: { value: formValues.rbc, touched: false },
        hgb: { value: formValues.hgb, touched: false },
        plt: { value: formValues.plt, touched: false },
        neu: { value: formValues.neu, touched: false },
        lym: { value: formValues.lym, touched: false },
        notes: { value: formValues.notes, touched: false },
        chemoCycleId: { value: formValues.chemoCycleId, touched: false },
      };
      setFormData(newFormData);

      // Check for abnormal values on load
      checkForAbnormalValues(newFormData);
    } else {
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        date: { value: today, touched: false },
      }));
    }
  }, [initialData]);

  /**
   * Validate a single field
   */
  const validateField = (
    name: keyof BloodTestFormData,
    value: string
  ): { error?: string; warning?: string } => {
    const result: { error?: string; warning?: string } = {};

    // Date validation
    if (name === 'date') {
      if (!value) {
        result.error = '检测日期是必需的';
      } else {
        const date = new Date(value);
        const now = new Date();
        if (date > now) {
          result.error = '检测日期不能是未来的日期';
        }
      }
      return result;
    }

    // Required fields validation
    const requiredFields: (keyof BloodTestFormData)[] = [
      'wbc',
      'rbc',
      'hgb',
      'plt',
    ];
    if (requiredFields.includes(name) && !value) {
      result.error = `${
        NORMAL_RANGES[name as keyof typeof NORMAL_RANGES]?.name || name
      }是必需的`;
      return result;
    }

    // Numeric validation
    if (value && isNaN(parseFloat(value))) {
      result.error = '请输入有效的数字';
      return result;
    }

    // Range validation and warnings
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && NORMAL_RANGES[name as keyof typeof NORMAL_RANGES]) {
      const range = NORMAL_RANGES[name as keyof typeof NORMAL_RANGES];

      // Check for extreme values (possible errors)
      const extremeThreshold = 3; // 3x outside normal range
      if (
        numValue < range.min / extremeThreshold ||
        numValue > range.max * extremeThreshold
      ) {
        result.error = `数值似乎异常，请检查输入是否正确（正常范围: ${range.min}-${range.max} ${range.unit}）`;
      }
      // Check for values outside normal range (warning)
      else if (numValue < range.min || numValue > range.max) {
        const direction = numValue < range.min ? '低于' : '高于';
        result.warning = `⚠️ ${direction}正常范围（${range.min}-${range.max} ${range.unit}）`;
      }
    }

    return result;
  };

  /**
   * Check for abnormal values and show form-level warning
   */
  const checkForAbnormalValues = (data: FormFields) => {
    const abnormalFields: string[] = [];

    (Object.keys(NORMAL_RANGES) as Array<keyof typeof NORMAL_RANGES>).forEach(
      key => {
        const value = parseFloat(data[key]?.value);
        if (!isNaN(value)) {
          const range = NORMAL_RANGES[key];
          if (value < range.min || value > range.max) {
            abnormalFields.push(range.name);
          }
        }
      }
    );

    if (abnormalFields.length > 0) {
      setFormLevelWarning(
        `注意：以下指标超出正常范围：${abnormalFields.join(
          '、'
        )}。建议咨询医生。`
      );
    } else {
      setFormLevelWarning('');
    }
  };

  /**
   * Handle field change
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    const validation = validateField(name as keyof BloodTestFormData, value);

    const newFormData = {
      ...formData,
      [name]: {
        value,
        touched: true,
        error: validation.error,
        warning: validation.warning,
      },
    };

    setFormData(newFormData);
    checkForAbnormalValues(newFormData as FormFields);
    setSubmitError('');
  };

  /**
   * Handle field blur (for validation on blur)
   */
  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const validation = validateField(name as keyof BloodTestFormData, value);

    setFormData(prev => ({
      ...prev,
      [name]: {
        ...prev[name as keyof BloodTestFormData],
        touched: true,
        error: validation.error,
        warning: validation.warning,
      },
    }));
  };

  /**
   * Validate entire form
   */
  const validateForm = (): boolean => {
    let isValid = true;
    const newFormData = { ...formData };

    (Object.keys(formData) as Array<keyof BloodTestFormData>).forEach(key => {
      const field = formData[key];
      const validation = validateField(key, field.value);

      newFormData[key] = {
        ...field,
        touched: true,
        error: validation.error,
        warning: validation.warning,
      };

      if (validation.error) {
        isValid = false;
      }
    });

    setFormData(newFormData);
    return isValid;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const rawFormData: BloodTestFormData = {
      date: formData.date.value,
      wbc: formData.wbc.value,
      rbc: formData.rbc.value,
      hgb: formData.hgb.value,
      plt: formData.plt.value,
      neu: formData.neu.value,
      lym: formData.lym.value,
      notes: formData.notes.value,
      chemoCycleId: formData.chemoCycleId.value,
    };

    try {
      if (beforeSubmit) {
        const decision = await beforeSubmit(rawFormData);
        if (decision === 'cancel') {
          setIsSubmitting(false);
          return;
        }
      }

      const apiData = bloodTestService.convertFormToApiData(rawFormData);

      if (isEditing && initialData?._id) {
        await bloodTestService.updateBloodTest(initialData._id, apiData);
      } else {
        await bloodTestService.createBloodTest(apiData);
      }

      onSubmitSuccess();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError(isEditing ? '更新失败，请重试' : '保存失败，请重试');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Clear all fields
   */
  const handleClear = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      date: { value: today, touched: false },
      wbc: { value: '', touched: false },
      rbc: { value: '', touched: false },
      hgb: { value: '', touched: false },
      plt: { value: '', touched: false },
      neu: { value: '', touched: false },
      lym: { value: '', touched: false },
      notes: { value: '', touched: false },
      chemoCycleId: { value: '', touched: false },
    });
    setFormLevelWarning('');
    setSubmitError('');
  };

  /**
   * Render input field with validation
   */
  const renderField = (
    name: keyof BloodTestFormData,
    label: string,
    unit: string,
    isRequired = false,
    placeholder = ''
  ) => {
    const field = formData[name];
    const hasError = field.touched && field.error;
    const hasWarning = field.touched && field.warning && !field.error;

    return (
      <div
        className={`form-field ${hasError ? 'has-error' : ''} ${
          hasWarning ? 'has-warning' : ''
        }`}
      >
        <label htmlFor={name}>
          {label}
          {isRequired && <span className="required">*</span>}
          <span className="unit">({unit})</span>
        </label>
        <input
          type="text"
          id={name}
          name={name}
          value={field.value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={isSubmitting}
          className={
            hasError ? 'input-error' : hasWarning ? 'input-warning' : ''
          }
        />
        {hasError && <span className="error-message">{field.error}</span>}
        {hasWarning && <span className="warning-message">{field.warning}</span>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="blood-test-form">
      <h2>{isEditing ? '编辑血常规记录' : '添加血常规记录'}</h2>

      {submitError && <div className="form-error">{submitError}</div>}
      {formLevelWarning && (
        <div className="form-warning">{formLevelWarning}</div>
      )}

      {/* 实时骨髓抑制评级及指南提示 */}
      {(() => {
        const neuVal = parseFloat(formData.neu.value);
        if (!isNaN(neuVal)) {
          const gradeInfo = getMyelosuppressionGrade(neuVal);
          if (gradeInfo && gradeInfo.grade > 0) {
            return (
              <div className={`myelo-grade-alert ${gradeInfo.className}`}>
                <div className="alert-header">
                  <strong>⚠️ 中性粒细胞减少分级：{gradeInfo.label}</strong>
                  <span className="grade-value">
                    {neuVal.toFixed(2)} ×10⁹/L
                  </span>
                </div>
                <p className="alert-desc">{gradeInfo.description}</p>
                <div className="alert-guidelines">
                  <h5>🛡️ 患者防感染指引：</h5>
                  <ul>
                    {gradeInfo.guidelines.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          }
        }
        return null;
      })()}

      <div className="form-section">
        <h3>基本信息</h3>
        <div className="form-row">
          <div
            className={`form-field ${
              formData.date.touched && formData.date.error ? 'has-error' : ''
            }`}
          >
            <label htmlFor="date">
              检测日期<span className="required">*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date.value}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              className={
                formData.date.touched && formData.date.error
                  ? 'input-error'
                  : ''
              }
            />
            {formData.date.touched && formData.date.error && (
              <span className="error-message">{formData.date.error}</span>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>血常规指标</h3>
        <div className="form-grid">
          {renderField('wbc', '白细胞', '×10⁹/L', true, '4.0-10.0')}
          {renderField('rbc', '红细胞', '×10¹²/L', true, '3.5-5.8')}
          {renderField('hgb', '血红蛋白', 'g/L', true, '110-165')}
          {renderField('plt', '血小板', '×10⁹/L', true, '100-300')}
          {renderField('neu', '中性粒细胞', '×10⁹/L', false, '1.8-6.3')}
          {renderField('lym', '淋巴细胞', '×10⁹/L', false, '1.0-4.8')}
        </div>
      </div>

      <div className="form-section">
        <h3>化疗周期关联</h3>
        <div className="form-field">
          <label htmlFor="chemoCycleId">关联到化疗周期（可选）</label>
          <select
            id="chemoCycleId"
            name="chemoCycleId"
            value={formData.chemoCycleId.value}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                chemoCycleId: { value: e.target.value, touched: true },
              }))
            }
            disabled={isSubmitting}
          >
            <option value="">自动按日期匹配</option>
            <option value="none">不关联任何周期</option>
            {cycles.map(c => {
              const start = new Date(c.startDate).toLocaleDateString('zh-CN');
              const end = new Date(c.endDate).toLocaleDateString('zh-CN');
              const drugs = (c.medications || [])
                .map(m => m.name)
                .filter(Boolean)
                .join('、');
              return (
                <option key={c._id} value={c._id}>
                  {c.regimenName || '未命名方案'}：{start} ~ {end}
                  {drugs ? `（${drugs}）` : ''}
                </option>
              );
            })}
          </select>
          <span className="reference-note">
            选择"自动按日期匹配"后，系统会根据检测日期落入哪个周期自动关联。
          </span>
        </div>
      </div>

      <div className="form-section">
        <h3>备注</h3>
        <div className="form-field">
          <textarea
            id="notes"
            name="notes"
            value={formData.notes.value}
            onChange={handleChange}
            placeholder="添加备注信息（可选）..."
            rows={3}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? isEditing
              ? '更新中...'
              : '保存中...'
            : isEditing
            ? '更新记录'
            : '保存记录'}
        </button>
        {!isEditing && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={isSubmitting}
          >
            清空
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            取消
          </button>
        )}
      </div>

      <div className="form-reference">
        <h4>参考范围（成人）</h4>
        <ul>
          <li>白细胞 (WBC): 4.0-10.0 ×10⁹/L</li>
          <li>红细胞 (RBC): 3.5-5.8 ×10¹²/L</li>
          <li>血红蛋白 (HGB): 110-165 g/L</li>
          <li>血小板 (PLT): 100-300 ×10⁹/L</li>
          <li>中性粒细胞 (NEU): 1.8-6.3 ×10⁹/L</li>
          <li>淋巴细胞 (LYM): 1.0-4.8 ×10⁹/L</li>
        </ul>
        <p className="reference-note">
          *
          注：参考范围可能因年龄、性别和检测方法而有所不同。请以您的医生诊断为准。
        </p>
      </div>
    </form>
  );
};

export default BloodTestForm;
