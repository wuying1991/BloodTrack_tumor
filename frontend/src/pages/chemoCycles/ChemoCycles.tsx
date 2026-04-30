import React, { useState, useEffect, useCallback } from 'react';
import chemoCycleService, {
  ChemoCycle,
  ChemoCycleFormData,
  ChemoMedication,
} from '../../services/chemoCycle/chemoCycleService';
import './ChemoCycles.css';

type ViewMode = 'list' | 'add' | 'edit';

const emptyMedication = (): ChemoMedication => ({
  name: '',
  dosage: '',
  schedule: '',
});

const emptyFormData = (): ChemoCycleFormData => ({
  startDate: '',
  endDate: '',
  medications: [emptyMedication()],
  doctorNotes: '',
});

const ChemoCycles: React.FC = () => {
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
    } catch {
      setError('加载失败，请检查网络连接后重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const formatDate = (s: string): string => {
    const d = new Date(s);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.startDate) errs.startDate = '开始日期是必需的';
    if (!formData.endDate) errs.endDate = '结束日期是必需的';
    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.endDate) < new Date(formData.startDate)
    ) {
      errs.endDate = '结束日期必须晚于开始日期';
    }
    const validMeds = formData.medications.filter(m => m.name);
    if (validMeds.length === 0) errs.medications = '至少需要一种药物';
    for (let i = 0; i < formData.medications.length; i++) {
      const m = formData.medications[i];
      if (m.name && !m.dosage) errs[`dosage_${i}`] = '请输入剂量';
      if (m.name && !m.schedule) errs[`schedule_${i}`] = '请输入时间表';
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
      setError('加载化疗周期详情失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个化疗周期吗？此操作无法撤销。')) return;
    try {
      await chemoCycleService.deleteChemoCycle(id);
      await fetchCycles();
    } catch {
      setError('删除失败，请重试');
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
      setError(viewMode === 'edit' ? '更新失败，请重试' : '保存失败，请重试');
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
      medications: [...prev.medications, emptyMedication()],
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

  if (isLoading) {
    return (
      <div className="chemo-cycles loading">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (error && cycles.length === 0) {
    return (
      <div className="chemo-cycles error">
        <div className="error-message">{error}</div>
        <button className="btn btn-secondary" onClick={fetchCycles}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="chemo-cycles-page">
      <div className="page-header">
        <h1>化疗周期</h1>
        {viewMode === 'list' && (
          <button className="btn btn-primary" onClick={handleAddNew}>
            添加周期
          </button>
        )}
      </div>

      {viewMode === 'list' && (
        <>
          {cycles.length === 0 ? (
            <div className="empty-state">
              <p>暂无化疗周期记录</p>
              <p className="empty-hint">
                点击上方的"添加周期"按钮创建您的第一个化疗周期记录
              </p>
            </div>
          ) : (
            <div className="cycle-list">
              {cycles.map(cycle => (
                <div key={cycle._id} className="cycle-card">
                  <div className="cycle-header">
                    <div className="cycle-dates">
                      <span className="cycle-date-label">开始：</span>
                      {formatDate(cycle.startDate)}
                      <span className="cycle-date-sep">→</span>
                      <span className="cycle-date-label">结束：</span>
                      {formatDate(cycle.endDate)}
                    </div>
                    <div className="cycle-actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEdit(cycle)}
                      >
                        编辑
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(cycle._id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  <div className="cycle-medications">
                    <h4>药物方案</h4>
                    <div className="med-list">
                      {cycle.medications.map((med, idx) => (
                        <div key={idx} className="med-item">
                          <span className="med-name">{med.name}</span>
                          <span className="med-dosage">{med.dosage}</span>
                          <span className="med-schedule">{med.schedule}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {cycle.doctorNotes && (
                    <div className="cycle-notes">
                      <h4>医生备注</h4>
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
          <h2>{viewMode === 'edit' ? '更新周期' : '新建化疗周期'}</h2>

          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label>开始日期 *</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={e =>
                setFormData(prev => ({ ...prev, startDate: e.target.value }))
              }
              className={formErrors.startDate ? 'input-error' : ''}
            />
            {formErrors.startDate && (
              <span className="field-error">{formErrors.startDate}</span>
            )}
          </div>

          <div className="form-group">
            <label>结束日期 *</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={e =>
                setFormData(prev => ({ ...prev, endDate: e.target.value }))
              }
              className={formErrors.endDate ? 'input-error' : ''}
            />
            {formErrors.endDate && (
              <span className="field-error">{formErrors.endDate}</span>
            )}
          </div>

          <div className="form-group">
            <label>药物方案 *</label>
            {formErrors.medications && (
              <span className="field-error block">
                {formErrors.medications}
              </span>
            )}
            {formData.medications.map((med, idx) => (
              <div key={idx} className="medication-entry">
                <div className="med-row">
                  <input
                    type="text"
                    placeholder="药物名称"
                    value={med.name}
                    onChange={e =>
                      updateMedication(idx, 'name', e.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="剂量"
                    value={med.dosage}
                    onChange={e =>
                      updateMedication(idx, 'dosage', e.target.value)
                    }
                    className={formErrors[`dosage_${idx}`] ? 'input-error' : ''}
                  />
                  <input
                    type="text"
                    placeholder="用药时间表"
                    value={med.schedule}
                    onChange={e =>
                      updateMedication(idx, 'schedule', e.target.value)
                    }
                    className={
                      formErrors[`schedule_${idx}`] ? 'input-error' : ''
                    }
                  />
                  {formData.medications.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => removeMedication(idx)}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {formErrors[`dosage_${idx}`] && (
                  <span className="field-error">
                    {formErrors[`dosage_${idx}`]}
                  </span>
                )}
                {formErrors[`schedule_${idx}`] && (
                  <span className="field-error">
                    {formErrors[`schedule_${idx}`]}
                  </span>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addMedication}
            >
              添加药物
            </button>
          </div>

          <div className="form-group">
            <label>医生备注</label>
            <textarea
              rows={3}
              value={formData.doctorNotes}
              onChange={e =>
                setFormData(prev => ({ ...prev, doctorNotes: e.target.value }))
              }
              placeholder="医生意见或备注..."
            />
          </div>

          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? '保存中...'
                : viewMode === 'edit'
                ? '更新周期'
                : '保存'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChemoCycles;
