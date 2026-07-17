import React, { useState, useEffect, useCallback } from 'react';
import reminderService, {
  Reminder,
  ReminderType,
  ReminderRecurrence,
  ReminderCreateData,
  ListFilter,
} from '../../services/reminder/reminderService';
import { ApiError } from '../../services/api/apiClient';
import {
  translateApiError,
  translateFieldError,
} from '../../services/api/errorMapper';
import { useT } from '../../i18n/useT';
import './Reminders.css';

type ViewMode = 'list' | 'add' | 'edit';

interface FormData {
  title: string;
  description: string;
  type: ReminderType;
  dueDate: string; // datetime-local string (yyyy-MM-ddThh:mm)
  recurrence: ReminderRecurrence;
  enabled: boolean;
  emailNotify: boolean;
  pushNotify: boolean;
}

const emptyForm = (): FormData => ({
  title: '',
  description: '',
  type: 'custom',
  dueDate: '',
  recurrence: 'none',
  enabled: true,
  emailNotify: true,
  pushNotify: true,
});

/** 把 ISO 字符串转成 datetime-local 输入框需要的本地时区格式 */
const isoToLocalInput = (iso: string): string => {
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

const reminderToForm = (r: Reminder): FormData => ({
  title: r.title,
  description: r.description ?? '',
  type: r.type,
  dueDate: isoToLocalInput(r.dueDate),
  recurrence: r.recurrence,
  enabled: r.enabled,
  emailNotify: r.notifications?.email ?? true,
  pushNotify: r.notifications?.push ?? true,
});

const formToCreatePayload = (f: FormData): ReminderCreateData => ({
  title: f.title.trim(),
  description: f.description.trim() || undefined,
  type: f.type,
  dueDate: new Date(f.dueDate).toISOString(),
  recurrence: f.recurrence,
  enabled: f.enabled,
  notifications: { email: f.emailNotify, push: f.pushNotify },
});

const formatDueDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Reminders: React.FC = () => {
  const t = useT('reminders');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<ListFilter>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const typeLabels: Record<ReminderType, string> = {
    'blood-test': t('type.blood-test'),
    'chemo-cycle': t('type.chemo-cycle'),
    medication: t('type.medication'),
    'follow-up': t('type.follow-up'),
    custom: t('type.custom'),
  };
  const recurrenceLabels: Record<ReminderRecurrence, string> = {
    none: t('recurrence.none'),
    daily: t('recurrence.daily'),
    weekly: t('recurrence.weekly'),
    monthly: t('recurrence.monthly'),
  };

  const fetchReminders = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await reminderService.getReminders(filter);
      if (res.success) setReminders(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? translateApiError(e) : t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = t('errTitleEmpty');
    else if (form.title.length > 120) errs.title = t('errTitleTooLong');
    if (!form.dueDate) errs.dueDate = t('errDueEmpty');
    if (form.description.length > 1000) errs.description = t('errDescTooLong');
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormErrors({});
    setError('');
    setViewMode('add');
  };

  const handleEdit = (r: Reminder) => {
    setEditing(r);
    setForm(reminderToForm(r));
    setFormErrors({});
    setError('');
    setViewMode('edit');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setError('');
    try {
      const payload = formToCreatePayload(form);
      if (viewMode === 'edit' && editing) {
        await reminderService.updateReminder(editing._id, payload);
      } else {
        await reminderService.createReminder(payload);
      }
      await fetchReminders();
      setViewMode('list');
    } catch (e) {
      if (e instanceof ApiError) {
        setError(translateApiError(e));
        if (e.errors || e.errorCodes) {
          const fields = Array.from(
            new Set([
              ...Object.keys(e.errors || {}),
              ...Object.keys(e.errorCodes || {}),
            ])
          );
          const map: Record<string, string> = {};
          fields.forEach(f => {
            const m = translateFieldError(e, f);
            if (m) map[f] = m;
          });
          if (Object.keys(map).length > 0) setFormErrors(map);
        }
      } else {
        setError(viewMode === 'edit' ? t('updateFailed') : t('saveFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (r: Reminder) => {
    try {
      await reminderService.completeReminder(r._id);
      await fetchReminders();
    } catch (e) {
      window.alert(
        e instanceof ApiError ? translateApiError(e) : t('opFailed')
      );
    }
  };

  const handleDelete = async (r: Reminder) => {
    if (!window.confirm(t('deleteConfirm', { title: r.title }))) return;
    try {
      await reminderService.deleteReminder(r._id);
      await fetchReminders();
    } catch (e) {
      window.alert(
        e instanceof ApiError ? translateApiError(e) : t('deleteFailed')
      );
    }
  };

  const renderForm = () => (
    <div className="reminder-form">
      <h2>{viewMode === 'edit' ? t('editTitle') : t('createTitle')}</h2>
      {error && <div className="form-error">{error}</div>}

      <div className="form-grid">
        <div className="full">
          <label>{t('titleLabel')}</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          />
          {formErrors.title && (
            <span className="field-error">{formErrors.title}</span>
          )}
        </div>

        <div>
          <label>{t('typeLabel')}</label>
          <select
            value={form.type}
            onChange={e =>
              setForm(p => ({ ...p, type: e.target.value as ReminderType }))
            }
          >
            {(Object.keys(typeLabels) as ReminderType[]).map(tp => (
              <option key={tp} value={tp}>
                {typeLabels[tp]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>{t('recurrenceLabel')}</label>
          <select
            value={form.recurrence}
            onChange={e =>
              setForm(p => ({
                ...p,
                recurrence: e.target.value as ReminderRecurrence,
              }))
            }
          >
            {(Object.keys(recurrenceLabels) as ReminderRecurrence[]).map(r => (
              <option key={r} value={r}>
                {recurrenceLabels[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="full">
          <label>{t('dueLabel')}</label>
          <input
            type="datetime-local"
            value={form.dueDate}
            onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
          />
          {formErrors.dueDate && (
            <span className="field-error">{formErrors.dueDate}</span>
          )}
        </div>

        <div className="full">
          <label>{t('descLabel')}</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={e =>
              setForm(p => ({ ...p, description: e.target.value }))
            }
            placeholder={t('descPlaceholder')}
          />
          {formErrors.description && (
            <span className="field-error">{formErrors.description}</span>
          )}
        </div>

        <div className="full checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e =>
                setForm(p => ({ ...p, enabled: e.target.checked }))
              }
            />
            {t('enabled')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.emailNotify}
              onChange={e =>
                setForm(p => ({ ...p, emailNotify: e.target.checked }))
              }
            />
            {t('emailNotify')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.pushNotify}
              onChange={e =>
                setForm(p => ({ ...p, pushNotify: e.target.checked }))
              }
            />
            {t('pushNotify')}
          </label>
        </div>
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
            ? t('update')
            : t('save')}
        </button>
        <button className="btn btn-secondary" onClick={handleCancel}>
          {t('cancel')}
        </button>
      </div>
    </div>
  );

  const renderItem = (r: Reminder) => {
    const due = new Date(r.dueDate).getTime();
    const isOverdue = !r.completed && due < Date.now();
    return (
      <div
        key={r._id}
        className={[
          'reminder-card',
          r.completed ? 'completed' : '',
          isOverdue ? 'overdue' : '',
          !r.enabled ? 'disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="reminder-info">
          <div
            className={`reminder-title ${r.completed ? 'completed-text' : ''}`}
          >
            {r.title}
          </div>
          {r.description && (
            <div className="reminder-description">{r.description}</div>
          )}
          <div className="reminder-meta">
            <span className="meta-tag">{typeLabels[r.type]}</span>
            <span className="meta-tag">{recurrenceLabels[r.recurrence]}</span>
            <span className={`meta-due ${isOverdue ? 'overdue' : ''}`}>
              {t('duePrefix')}
              {formatDueDate(r.dueDate)}
            </span>
            {!r.enabled && <span className="meta-tag">{t('disabledTag')}</span>}
            {r.completed && (
              <span className="meta-tag">{t('completedTag')}</span>
            )}
          </div>
        </div>
        <div className="reminder-actions">
          {!r.completed && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleComplete(r)}
            >
              {r.recurrence === 'none' ? t('complete') : t('completeRecurring')}
            </button>
          )}
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => handleEdit(r)}
          >
            {t('edit')}
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => handleDelete(r)}
          >
            {t('delete')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="reminders-page">
      <div className="page-header">
        <h1>{t('title')}</h1>
        {viewMode === 'list' && (
          <button className="btn btn-primary" onClick={handleAddNew}>
            {t('addReminder')}
          </button>
        )}
      </div>

      {viewMode === 'list' && (
        <>
          <div className="reminders-toolbar">
            <select
              value={filter.status ?? ''}
              onChange={e =>
                setFilter(prev => ({
                  ...prev,
                  status: (e.target.value as ListFilter['status']) || undefined,
                }))
              }
            >
              <option value="">{t('filterAllStatus')}</option>
              <option value="pending">{t('filterPending')}</option>
              <option value="completed">{t('filterCompleted')}</option>
            </select>
            <select
              value={filter.type ?? ''}
              onChange={e =>
                setFilter(prev => ({
                  ...prev,
                  type: (e.target.value as ReminderType) || undefined,
                }))
              }
            >
              <option value="">{t('filterAllType')}</option>
              {(Object.keys(typeLabels) as ReminderType[]).map(tp => (
                <option key={tp} value={tp}>
                  {typeLabels[tp]}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="form-error">{error}</div>}

          {isLoading ? (
            <div className="reminders-empty">{t('loading')}</div>
          ) : reminders.length === 0 ? (
            <div className="reminders-empty">
              <p>{t('empty')}</p>
              <p className="empty-hint">{t('emptyHint')}</p>
            </div>
          ) : (
            <div className="reminder-list">{reminders.map(renderItem)}</div>
          )}
        </>
      )}

      {(viewMode === 'add' || viewMode === 'edit') && renderForm()}
    </div>
  );
};

export default Reminders;
