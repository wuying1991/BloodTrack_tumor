import React, { useState, useEffect } from 'react';
import { BiochemTest } from '../../types';
import biochemService, {
  BiochemTestFormData,
} from '../../services/biochem/biochemService';
import chemoCycleService, {
  ChemoCycle,
} from '../../services/chemoCycle/chemoCycleService';
import { ApiError } from '../../services/api/apiClient';
import { useT } from '../../i18n/useT';
import { formatDate } from '../../utils/formatDate';
import '../bloodTest/BloodTestForm.css';

interface BiochemFormProps {
  initialData?: BiochemTest;
  onSubmitSuccess: () => void;
  onCancel?: () => void;
}

const LIVER_FIELDS = ['alt', 'ast', 'ahr', 'tbil', 'dbil', 'ibil', 'tp', 'alb', 'glo', 'ag', 'ggt', 'alp', 'che', 'tba', 'pa'];
const KIDNEY_FIELDS = ['bun', 'cr', 'ua', 'egfr'];
const ELECTROLYTE_FIELDS = ['k', 'na', 'cl', 'ca', 'p', 'ldh'];

const EMPTY_FORM: BiochemTestFormData = {
  date: new Date().toISOString().split('T')[0],
  notes: '',
  chemoCycleId: '',
  alt: '', ast: '', ahr: '', tbil: '', dbil: '', ibil: '',
  tp: '', alb: '', glo: '', ag: '', ggt: '', alp: '', che: '', tba: '', pa: '',
  bun: '', cr: '', ua: '', egfr: '',
  k: '', na: '', cl: '', ca: '', p: '', ldh: '',
};

const BiochemForm: React.FC<BiochemFormProps> = ({
  initialData,
  onSubmitSuccess,
  onCancel,
}) => {
  const t = useT('biochem');
  const isEditing = !!initialData;
  const [formData, setFormData] = useState<BiochemTestFormData>({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [cycles, setCycles] = useState<ChemoCycle[]>([]);

  useEffect(() => {
    chemoCycleService.getChemoCycles(1, 100)
      .then(res => setCycles(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(biochemService.convertApiToFormData(initialData));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const apiData = biochemService.convertFormToApiData(formData);
      if (isEditing && initialData?._id) {
        await biochemService.updateBiochemTest(initialData._id, apiData);
      } else {
        await biochemService.createBiochemTest(apiData);
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

  const renderField = (field: string) => (
    <div key={field} className="form-field">
      <label htmlFor={field}>{t(field)}</label>
      <input
        type="number"
        step="any"
        id={field}
        name={field}
        value={formData[field as keyof BiochemTestFormData] as string || ''}
        onChange={handleChange}
        disabled={isSubmitting}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="blood-test-form">
      <h2>{isEditing ? t('formTitleEdit') : t('formTitleAdd')}</h2>

      {submitError && <div className="form-error">{submitError}</div>}

      <div className="form-section">
        <h3>{t('basicInfo')}</h3>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="date">{t('testDate')}<span className="required">*</span></label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>{t('liverSection')}</h3>
        <div className="form-grid">
          {LIVER_FIELDS.map(renderField)}
        </div>
      </div>

      <div className="form-section">
        <h3>{t('kidneySection')}</h3>
        <div className="form-grid">
          {KIDNEY_FIELDS.map(renderField)}
        </div>
      </div>

      <div className="form-section">
        <h3>{t('electrolyteSection')}</h3>
        <div className="form-grid">
          {ELECTROLYTE_FIELDS.map(renderField)}
        </div>
      </div>

      <div className="form-section">
        <h3>{t('cycleAssociation')}</h3>
        <div className="form-field">
          <label htmlFor="chemoCycleId">{t('cycleSelect')}</label>
          <select
            id="chemoCycleId"
            name="chemoCycleId"
            value={formData.chemoCycleId}
            onChange={handleChange}
            disabled={isSubmitting}
          >
            <option value="">{t('autoMatch')}</option>
            <option value="none">{t('noAssociation')}</option>
            {cycles.map(c => {
              const regimen = c.regimenName || t('unnamedRegimen');
              const start = formatDate(c.startDate);
              const end = formatDate(c.endDate);
              return (
                <option key={c._id} value={c._id}>
                  {t('cycleOptionLabel', { regimen, start, end })}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="form-section">
        <h3>{t('notes')}</h3>
        <div className="form-field">
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder={t('notesPlaceholder')}
            rows={3}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isEditing ? t('updateRecord') : t('saveRecord')}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>
            {t('cancel')}
          </button>
        )}
      </div>
    </form>
  );
};

export default BiochemForm;
