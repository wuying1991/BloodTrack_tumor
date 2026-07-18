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
import { useT } from '../../i18n/useT';
import { formatDate } from '../../utils/formatDate';
import './BloodTestForm.css';

// Numeric ranges only (labels come from i18n)
const NORMAL_RANGES: Record<string, { min: number; max: number; unit: string; nameKey: string }> = {
  wbc: { min: 4.0, max: 10.0, unit: '×10⁹/L', nameKey: 'wbc' },
  rbc: { min: 3.5, max: 5.8, unit: '×10¹²/L', nameKey: 'rbc' },
  hgb: { min: 110, max: 165, unit: 'g/L', nameKey: 'hgb' },
  plt: { min: 100, max: 300, unit: '×10⁹/L', nameKey: 'plt' },
  neu: { min: 1.8, max: 6.3, unit: '×10⁹/L', nameKey: 'neu' },
  lym: { min: 1.0, max: 4.8, unit: '×10⁹/L', nameKey: 'lym' },
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
  const t = useT('bloodTests');
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

  useEffect(() => {
    let mounted = true;
    chemoCycleService
      .getChemoCycles(1, 100)
      .then(res => {
        if (mounted) setCycles(res.data || []);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

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
      checkForAbnormalValues(newFormData);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: { value: today, touched: false } }));
    }
  }, [initialData]);

  const validateField = (
    name: keyof BloodTestFormData,
    value: string
  ): { error?: string; warning?: string } => {
    const result: { error?: string; warning?: string } = {};

    if (name === 'date') {
      if (!value) {
        result.error = t('dateRequired');
      } else {
        const date = new Date(value);
        const now = new Date();
        if (date > now) {
          result.error = t('dateFuture');
        }
      }
      return result;
    }

    const requiredFields: (keyof BloodTestFormData)[] = ['wbc', 'rbc', 'hgb', 'plt'];
    if (requiredFields.includes(name) && !value) {
      const range = NORMAL_RANGES[name as string];
      result.error = t('fieldRequired', { name: range ? t(range.nameKey) : name });
      return result;
    }

    if (value && isNaN(parseFloat(value))) {
      result.error = t('invalidNumber');
      return result;
    }

    const numValue = parseFloat(value);
    const range = NORMAL_RANGES[name as string];
    if (!isNaN(numValue) && range) {
      const extremeThreshold = 3;
      if (numValue < range.min / extremeThreshold || numValue > range.max * extremeThreshold) {
        result.error = t('valueAbnormal', { min: range.min, max: range.max, unit: range.unit });
      } else if (numValue < range.min || numValue > range.max) {
        const direction = numValue < range.min ? 'valueLow' : 'valueHigh';
        result.warning = t(direction, { min: range.min, max: range.max, unit: range.unit });
      }
    }

    return result;
  };

  const checkForAbnormalValues = (data: FormFields) => {
    const abnormalFields: string[] = [];

    (Object.keys(NORMAL_RANGES) as string[]).forEach(key => {
      const value = parseFloat(data[key as keyof BloodTestFormData]?.value);
      if (!isNaN(value)) {
        const range = NORMAL_RANGES[key];
        if (value < range.min || value > range.max) {
          abnormalFields.push(t(range.nameKey));
        }
      }
    });

    if (abnormalFields.length > 0) {
      setFormLevelWarning(t('abnormalWarning', { fields: abnormalFields.join('、') }));
    } else {
      setFormLevelWarning('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const validation = validateField(name as keyof BloodTestFormData, value);
    const newFormData = {
      ...formData,
      [name]: { value, touched: true, error: validation.error, warning: validation.warning },
    };
    setFormData(newFormData);
    checkForAbnormalValues(newFormData as FormFields);
    setSubmitError('');
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const validation = validateField(name as keyof BloodTestFormData, value);
    setFormData(prev => ({
      ...prev,
      [name]: { ...prev[name as keyof BloodTestFormData], touched: true, error: validation.error, warning: validation.warning },
    }));
  };

  const validateForm = (): boolean => {
    let isValid = true;
    const newFormData = { ...formData };
    (Object.keys(formData) as Array<keyof BloodTestFormData>).forEach(key => {
      const field = formData[key];
      const validation = validateField(key, field.value);
      newFormData[key] = { ...field, touched: true, error: validation.error, warning: validation.warning };
      if (validation.error) isValid = false;
    });
    setFormData(newFormData);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;

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
        if (decision === 'cancel') { setIsSubmitting(false); return; }
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
        setSubmitError(isEditing ? t('updateFailed') : t('saveFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div className={`form-field ${hasError ? 'has-error' : ''} ${hasWarning ? 'has-warning' : ''}`}>
        <label htmlFor={name as string}>
          {label}
          {isRequired && <span className="required">*</span>}
          <span className="unit">({unit})</span>
        </label>
        <input
          type="text"
          id={name as string}
          name={name as string}
          value={field.value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={isSubmitting}
          className={hasError ? 'input-error' : hasWarning ? 'input-warning' : ''}
        />
        {hasError && <span className="error-message">{field.error}</span>}
        {hasWarning && <span className="warning-message">{field.warning}</span>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="blood-test-form">
      <h2>{isEditing ? t('formTitleEdit') : t('formTitleAdd')}</h2>

      {submitError && <div className="form-error">{submitError}</div>}
      {formLevelWarning && <div className="form-warning">{formLevelWarning}</div>}

      {(() => {
        const neuVal = parseFloat(formData.neu.value);
        if (!isNaN(neuVal)) {
          const gradeInfo = getMyelosuppressionGrade(neuVal);
          if (gradeInfo && gradeInfo.grade > 0) {
            return (
              <div className={`myelo-grade-alert ${gradeInfo.className}`}>
                <div className="alert-header">
                  <strong>⚠️ {t('gradeSuppression', { grade: gradeInfo.grade })}</strong>
                  <span className="grade-value">{neuVal.toFixed(2)} ×10⁹/L</span>
                </div>
                <p className="alert-desc">{gradeInfo.description}</p>
                <div className="alert-guidelines">
                  <h5>🛡️</h5>
                  <ul>
                    {gradeInfo.guidelines.map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
              </div>
            );
          }
        }
        return null;
      })()}

      <div className="form-section">
        <h3>{t('basicInfo')}</h3>
        <div className="form-row">
          <div className={`form-field ${formData.date.touched && formData.date.error ? 'has-error' : ''}`}>
            <label htmlFor="date">{t('testDate')}<span className="required">*</span></label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date.value}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              className={formData.date.touched && formData.date.error ? 'input-error' : ''}
            />
            {formData.date.touched && formData.date.error && (
              <span className="error-message">{formData.date.error}</span>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>{t('indicators')}</h3>
        <div className="form-grid">
          {renderField('wbc', t('wbc'), '×10⁹/L', true, '4.0-10.0')}
          {renderField('rbc', t('rbc'), '×10¹²/L', true, '3.5-5.8')}
          {renderField('hgb', t('hgb'), 'g/L', true, '110-165')}
          {renderField('plt', t('plt'), '×10⁹/L', true, '100-300')}
          {renderField('neu', t('neu'), '×10⁹/L', false, '1.8-6.3')}
          {renderField('lym', t('lym'), '×10⁹/L', false, '1.0-4.8')}
        </div>
      </div>

      <div className="form-section">
        <h3>{t('cycleAssociation')}</h3>
        <div className="form-field">
          <label htmlFor="chemoCycleId">{t('cycleSelect')}</label>
          <select
            id="chemoCycleId"
            name="chemoCycleId"
            value={formData.chemoCycleId.value}
            onChange={e => setFormData(prev => ({ ...prev, chemoCycleId: { value: e.target.value, touched: true } }))}
            disabled={isSubmitting}
          >
            <option value="">{t('autoMatch')}</option>
            <option value="none">{t('noAssociation')}</option>
            {cycles.map(c => {
              const regimen = c.regimenName || t('unnamedRegimen');
              const start = formatDate(c.startDate);
              const end = formatDate(c.endDate);
              const drugs = (c.medications || [])
                .map(m => m.name)
                .filter(Boolean)
                .join(t('drugSeparator'));
              const label = drugs
                ? t('cycleOptionWithDrugs', { regimen, start, end, drugs })
                : t('cycleOptionLabel', { regimen, start, end });
              return (
                <option key={c._id} value={c._id}>
                  {label}
                </option>
              );
            })}
          </select>
          <span className="reference-note">{t('cycleSelectHint')}</span>
        </div>
      </div>

      <div className="form-section">
        <h3>{t('notes')}</h3>
        <div className="form-field">
          <textarea
            id="notes"
            name="notes"
            value={formData.notes.value}
            onChange={handleChange}
            placeholder={t('notesPlaceholder')}
            rows={3}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? t('updating') : t('saving')) : (isEditing ? t('updateRecord') : t('saveRecord'))}
        </button>
        {!isEditing && (
          <button type="button" className="btn btn-secondary" onClick={handleClear} disabled={isSubmitting}>
            {t('clear')}
          </button>
        )}
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>
            {t('cancel')}
          </button>
        )}
      </div>

      <div className="form-reference">
        <h4>{t('referenceTitle')}</h4>
        <ul>
          <li>{t('wbc')}: 4.0-10.0 ×10⁹/L</li>
          <li>{t('rbc')}: 3.5-5.8 ×10¹²/L</li>
          <li>{t('hgb')}: 110-165 g/L</li>
          <li>{t('plt')}: 100-300 ×10⁹/L</li>
          <li>{t('neu')}: 1.8-6.3 ×10⁹/L</li>
          <li>{t('lym')}: 1.0-4.8 ×10⁹/L</li>
        </ul>
        <p className="reference-note">{t('referenceNote')}</p>
      </div>
    </form>
  );
};

export default BloodTestForm;
