import React, { useState, useEffect, useCallback } from 'react';
import reminderService, {
  Reminder,
  ReminderType,
  ReminderRecurrence,
  ReminderCreateData,
  ListFilter,
} from '../../services/reminder/reminderService';
import { ApiError } from '../../services/api/apiClient';
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

const TYPE_LABELS: Record<ReminderType, string> = {
  'blood-test': '血常规复查',
  'chemo-cycle': '化疗周期',
  medication: '用药提醒',
  'follow-up': '复诊随访',
  custom: '自定义',
};

const RECURRENCE_LABELS: Record<ReminderRecurrence, string> = {
  none: '不重复',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
};

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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<ListFilter>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchReminders = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await reminderService.getReminders(filter);
      if (res.success) setReminders(res.data);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : '加载失败，请检查网络连接后重试'
      );
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = '标题不能为空';
    else if (form.title.length > 120) errs.title = '标题最多 120 字符';
    if (!form.dueDate) errs.dueDate = '到期日期不能为空';
    if (form.description.length > 1000) errs.description = '备注最多 1000 字符';
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
        setError(e.message);
        if (e.errors) setFormErrors(e.errors);
      } else {
        setError(viewMode === 'edit' ? '更新失败，请重试' : '保存失败，请重试');
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
      window.alert(e instanceof ApiError ? e.message : '操作失败，请稍后重试');
    }
  };

  const handleDelete = async (r: Reminder) => {
    if (!window.confirm(`确定要删除提醒 "${r.title}" 吗？此操作无法撤销。`))
      return;
    try {
      await reminderService.deleteReminder(r._id);
      await fetchReminders();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : '删除失败，请重试');
    }
  };

  const renderForm = () => (
    <div className="reminder-form">
      <h2>{viewMode === 'edit' ? '编辑提醒' : '新建提醒'}</h2>
      {error && <div className="form-error">{error}</div>}

      <div className="form-grid">
        <div className="full">
          <label>标题 *</label>
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
          <label>类型</label>
          <select
            value={form.type}
            onChange={e =>
              setForm(p => ({ ...p, type: e.target.value as ReminderType }))
            }
          >
            {(Object.keys(TYPE_LABELS) as ReminderType[]).map(t => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>循环</label>
          <select
            value={form.recurrence}
            onChange={e =>
              setForm(p => ({
                ...p,
                recurrence: e.target.value as ReminderRecurrence,
              }))
            }
          >
            {(Object.keys(RECURRENCE_LABELS) as ReminderRecurrence[]).map(r => (
              <option key={r} value={r}>
                {RECURRENCE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="full">
          <label>到期时间 *</label>
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
          <label>备注</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={e =>
              setForm(p => ({ ...p, description: e.target.value }))
            }
            placeholder="可选..."
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
            启用
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.emailNotify}
              onChange={e =>
                setForm(p => ({ ...p, emailNotify: e.target.checked }))
              }
            />
            邮件通知
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.pushNotify}
              onChange={e =>
                setForm(p => ({ ...p, pushNotify: e.target.checked }))
              }
            />
            推送通知
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? '保存中...' : viewMode === 'edit' ? '更新' : '保存'}
        </button>
        <button className="btn btn-secondary" onClick={handleCancel}>
          取消
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
            <span className="meta-tag">{TYPE_LABELS[r.type]}</span>
            <span className="meta-tag">{RECURRENCE_LABELS[r.recurrence]}</span>
            <span className={`meta-due ${isOverdue ? 'overdue' : ''}`}>
              到期：{formatDueDate(r.dueDate)}
            </span>
            {!r.enabled && <span className="meta-tag">已停用</span>}
            {r.completed && <span className="meta-tag">已完成</span>}
          </div>
        </div>
        <div className="reminder-actions">
          {!r.completed && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleComplete(r)}
            >
              {r.recurrence === 'none' ? '完成' : '完成本次'}
            </button>
          )}
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => handleEdit(r)}
          >
            编辑
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => handleDelete(r)}
          >
            删除
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="reminders-page">
      <div className="page-header">
        <h1>提醒管理</h1>
        {viewMode === 'list' && (
          <button className="btn btn-primary" onClick={handleAddNew}>
            添加提醒
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
              <option value="">全部状态</option>
              <option value="pending">未完成</option>
              <option value="completed">已完成</option>
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
              <option value="">全部类型</option>
              {(Object.keys(TYPE_LABELS) as ReminderType[]).map(t => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="form-error">{error}</div>}

          {isLoading ? (
            <div className="reminders-empty">加载中...</div>
          ) : reminders.length === 0 ? (
            <div className="reminders-empty">
              <p>暂无提醒</p>
              <p className="empty-hint">
                点击右上角"添加提醒"创建您的第一个提醒
              </p>
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
