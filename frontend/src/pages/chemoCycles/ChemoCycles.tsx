import React, { useState, useEffect, useCallback } from 'react';
import chemoCycleService, {
  ChemoCycle,
  ChemoCycleFormData,
  ChemoMedication,
  addDaysLocal,
} from '../../services/chemoCycle/chemoCycleService';
import { ApiError } from '../../services/api/apiClient';
import { translateApiError } from '../../services/api/errorMapper';
import { useT } from '../../i18n/useT';
import './ChemoCycles.css';

type ViewMode = 'list' | 'add' | 'edit';

const todayInput = (): string => new Date().toISOString().split('T')[0];

const emptyMedication = (startDate = '', endDate = ''): ChemoMedication => ({
  name: '',
  dosage: '',
  startDate,
  endDate,
  notes: '',
});

const emptyFormData = (): ChemoCycleFormData => {
  const startDate = todayInput();
  return {
    regimenName: '',
    startDate,
    endDate: addDaysLocal(startDate, 21),
    medications: [],
    doctorNotes: '',
  };
};

const ChemoCycles: React.FC = () => {
  const t = useT('chemoCycle');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [cycles, setCycles] = useState<ChemoCycle[]>([]);
  const [editingCycle, setEditingCycle] = useState<ChemoCycle | null>(null);
  const [formData, setFormData] = useState<ChemoCycleFormData>(emptyFormData());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchCycles = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await chemoCycleService.getChemoCycles();
      if (response.success) {
        setCycles(response.data);
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? translateApiError(err) : t('loadFailed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const formatDate = (s?: string): string => {
    if (!s) return '-';
    const d = new Date(s);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const hasMedicationContent = (m: ChemoMedication): boolean =>
    !!(m.name || m.dosage || m.startDate || m.endDate || m.notes);

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.regimenName.trim()) errs.regimenName = t('errRegimenName');
    if (!formData.startDate) errs.startDate = t('errStartDate');
    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.endDate) < new Date(formData.startDate)
    ) {
      errs.endDate = t('errEndDate');
    }

    for (let i = 0; i < formData.medications.length; i++) {
      const m = formData.medications[i];
      if (!hasMedicationContent(m)) continue;
      if (
        m.startDate &&
        m.endDate &&
        new Date(m.endDate) < new Date(m.startDate)
      ) {
        errs[`medication_${i}`] = t('errMedEndDate');
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddNew = () => {
    setEditingCycle(null);
    setFormData(emptyFormData());
    setFormErrors({});
    setViewMode('add');
  };

  const handleEdit = async (cycle: ChemoCycle) => {
    try {
      const response = await chemoCycleService.getChemoCycleById(cycle._id);
      if (response.success) {
        setEditingCycle(response.data);
        setFormData(chemoCycleService.convertApiToFormData(response.data));
        setFormErrors({});
        setViewMode('edit');
      }
    } catch {
      setError(t('loadDetailFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await chemoCycleService.deleteChemoCycle(id);
      await fetchCycles();
    } catch {
      setError(t('deleteFailed'));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setError('');

    const apiData = chemoCycleService.convertFormToApiData(formData);

    try {
      if (viewMode === 'edit' && editingCycle) {
        await chemoCycleService.updateChemoCycle(editingCycle._id, apiData);
      } else {
        await chemoCycleService.createChemoCycle(apiData);
      }
      await fetchCycles();
      setViewMode('list');
    } catch {
      setError(viewMode === 'edit' ? t('updateFailed') : t('saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingCycle(null);
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        emptyMedication(prev.startDate, prev.endDate),
      ],
    }));
  };

  const removeMedication = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== idx),
    }));
  };

  const updateMedication = (
    idx: number,
    field: keyof ChemoMedication,
    value: string
  ) => {
    setFormData(prev => {
      const next = [...prev.medications];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, medications: next };
    });
  };

  const updateStartDate = (value: string) => {
    setFormData(prev => ({
      ...prev,
      startDate: value,
      endDate: value ? addDaysLocal(value, 21) : '',
      medications: prev.medications.map(m => ({
        ...m,
        startDate: m.startDate || value,
        endDate: m.endDate || (value ? addDaysLocal(value, 21) : ''),
      })),
    }));
  };

  if (isLoading) {
    return (
      <div className="chemo-cycles loading">
        <div className="spinner" />
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (error && cycles.length === 0) {
    return (
      <div className="chemo-cycles error">
        <div className="error-message">{error}</div>
        <button className="btn btn-secondary" onClick={fetchCycles}>
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="chemo-cycles-page">
      <div className="page-header">
        <h1>{t('title')}</h1>
        {viewMode === 'list' && (
          <button className="btn btn-primary" onClick={handleAddNew}>
            {t('addCycle')}
          </button>
        )}
      </div>

      {viewMode === 'list' && (
        <>
          {cycles.length === 0 ? (
            <div className="empty-state">
              <p>{t('empty')}</p>
              <p className="empty-hint">{t('emptyHint')}</p>
            </div>
          ) : (
            <div className="cycle-list">
              {cycles.map(cycle => (
                <div key={cycle._id} className="cycle-card">
                  <div className="cycle-header">
                    <div>
                      <h3>{cycle.regimenName || t('unnamedRegimen')}</h3>
                      <div className="cycle-dates">
                        <span className="cycle-date-label">
                          {t('cycleLabel')}
                        </span>
                        {formatDate(cycle.startDate)}
                        <span className="cycle-date-sep">{'->'}</span>
                        {formatDate(cycle.endDate)}
                      </div>
                    </div>
                    <div className="cycle-actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEdit(cycle)}
                      >
                        {t('edit')}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(cycle._id)}
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>

                  <div className="cycle-medications">
                    <h4>{t('medications')}</h4>
                    {cycle.medications.length === 0 ? (
                      <p className="empty-hint">{t('medsEmpty')}</p>
                    ) : (
                      <div className="med-list">
                        {cycle.medications.map((med, idx) => (
                          <div key={idx} className="med-item">
                            <span className="med-name">
                              {med.name || t('unnamedMed')}
                            </span>
                            {med.dosage && (
                              <span className="med-dosage">{med.dosage}</span>
                            )}
                            <span className="med-schedule">
                              {formatDate(med.startDate)} {'->'}{' '}
                              {formatDate(med.endDate)}
                            </span>
                            {med.notes && (
                              <span className="med-notes">
                                {t('medNotesPrefix')}
                                {med.notes}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {cycle.doctorNotes && (
                    <div className="cycle-notes">
                      <h4>{t('doctorNotes')}</h4>
                      <p>{cycle.doctorNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {(viewMode === 'add' || viewMode === 'edit') && (
        <div className="cycle-form">
          <h2>{viewMode === 'edit' ? t('updateTitle') : t('createTitle')}</h2>

          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label>{t('regimenNameLabel')}</label>
            <input
              type="text"
              value={formData.regimenName}
              onChange={e =>
                setFormData(prev => ({ ...prev, regimenName: e.target.value }))
              }
              placeholder={t('regimenNamePlaceholder')}
              className={formErrors.regimenName ? 'input-error' : ''}
            />
            {formErrors.regimenName && (
              <span className="field-error">{formErrors.regimenName}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('startDateLabel')}</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e => updateStartDate(e.target.value)}
                className={formErrors.startDate ? 'input-error' : ''}
              />
              <small>{t('startDateHint')}</small>
              {formErrors.startDate && (
                <span className="field-error">{formErrors.startDate}</span>
              )}
            </div>

            <div className="form-group">
              <label>{t('endDateLabel')}</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e =>
                  setFormData(prev => ({ ...prev, endDate: e.target.value }))
                }
                className={formErrors.endDate ? 'input-error' : ''}
              />
              <small>{t('endDateHint')}</small>
              {formErrors.endDate && (
                <span className="field-error">{formErrors.endDate}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>{t('medsLabel')}</label>
            {formData.medications.length === 0 && (
              <p className="empty-hint">{t('medsFormHint')}</p>
            )}
            {formData.medications.map((med, idx) => (
              <div key={idx} className="medication-entry">
                <div className="med-row">
                  <input
                    type="text"
                    placeholder={t('medNamePlaceholder')}
                    value={med.name || ''}
                    onChange={e =>
                      updateMedication(idx, 'name', e.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder={t('medDosagePlaceholder')}
                    value={med.dosage || ''}
                    onChange={e =>
                      updateMedication(idx, 'dosage', e.target.value)
                    }
                  />
                  <input
                    type="date"
                    value={med.startDate || ''}
                    onChange={e =>
                      updateMedication(idx, 'startDate', e.target.value)
                    }
                    title={t('medStartDateTitle')}
                  />
                  <input
                    type="date"
                    value={med.endDate || ''}
                    onChange={e =>
                      updateMedication(idx, 'endDate', e.target.value)
                    }
                    title={t('medEndDateTitle')}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeMedication(idx)}
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder={t('medNotesPlaceholder')}
                  value={med.notes || ''}
                  onChange={e => updateMedication(idx, 'notes', e.target.value)}
                />
                {formErrors[`medication_${idx}`] && (
                  <span className="field-error">
                    {formErrors[`medication_${idx}`]}
                  </span>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addMedication}
            >
              {t('addMedication')}
            </button>
          </div>

          <div className="form-group">
            <label>{t('doctorNotesLabel')}</label>
            <textarea
              rows={3}
              value={formData.doctorNotes}
              onChange={e =>
                setFormData(prev => ({ ...prev, doctorNotes: e.target.value }))
              }
              placeholder={t('doctorNotesPlaceholder')}
            />
          </div>

          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t('saving')
                : viewMode === 'edit'
                ? t('updateTitle')
                : t('save')}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChemoCycles;
