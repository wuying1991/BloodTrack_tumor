import React, { useState } from 'react';
import shareService, {
  ShareCreatePayload,
  ShareExpiresIn,
  ShareScope,
} from '../../../services/share/shareService';
import { ApiError } from '../../../services/api/apiClient';
import './CreateShareDialog.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EXPIRES_LABELS: Array<{ value: ShareExpiresIn; label: string }> = [
  { value: '1d', label: '1 天' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
  { value: '90d', label: '90 天' },
  { value: 'never', label: '永不过期' },
];

const CreateShareDialog: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [scope, setScope] = useState<ShareScope>({
    bloodTests: true,
    chemoCycles: false,
    analytics: false,
  });
  const [expiresIn, setExpiresIn] = useState<ShareExpiresIn>('7d');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState('');

  if (!open) return null;

  const reset = () => {
    setScope({ bloodTests: true, chemoCycles: false, analytics: false });
    setExpiresIn('7d');
    setPin('');
    setErrors({});
    setCreatedUrl(null);
    setCopyMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!scope.bloodTests && !scope.chemoCycles && !scope.analytics) {
      next.scope = '请至少选择一项分享内容';
    }
    if (pin && !/^\d{4,6}$/.test(pin)) {
      next.pin = 'PIN 必须为 4–6 位数字';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      const payload: ShareCreatePayload = {
        scope,
        expiresIn,
        ...(pin ? { pin } : {}),
      };
      const res = await shareService.createShare(payload);
      const url = res.data.shareUrl;
      setCreatedUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setCopyMessage('链接已复制到剪贴板');
      } catch {
        setCopyMessage('请手动复制链接');
      }
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ form: err.message });
      } else {
        setErrors({ form: '创建失败，请重试' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {createdUrl ? (
          <div>
            <h3>✓ 创建成功</h3>
            <p>{copyMessage}</p>
            <pre
              style={{
                wordBreak: 'break-all',
                whiteSpace: 'pre-wrap',
                background: '#f5f5f5',
                padding: 8,
              }}
            >
              {createdUrl}
            </pre>
            <p style={{ color: '#c33' }}>
              ⚠ 此链接仅本次显示。请妥善保管，无法再次查看完整链接。
            </p>
            <button onClick={handleClose}>完成</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>创建分享链接</h3>

            <fieldset>
              <legend>分享内容（至少选一项）</legend>
              <label>
                <input
                  type="checkbox"
                  checked={scope.bloodTests}
                  onChange={e =>
                    setScope({ ...scope, bloodTests: e.target.checked })
                  }
                />{' '}
                血常规记录
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={scope.chemoCycles}
                  onChange={e =>
                    setScope({ ...scope, chemoCycles: e.target.checked })
                  }
                />{' '}
                化疗周期
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={scope.analytics}
                  onChange={e =>
                    setScope({ ...scope, analytics: e.target.checked })
                  }
                />{' '}
                趋势分析
              </label>
              {errors.scope && (
                <span style={{ color: '#c33' }}>{errors.scope}</span>
              )}
            </fieldset>

            <fieldset>
              <legend>有效期</legend>
              {EXPIRES_LABELS.map(opt => (
                <label key={opt.value}>
                  <input
                    type="radio"
                    name="expiresIn"
                    value={opt.value}
                    checked={expiresIn === opt.value}
                    onChange={() => setExpiresIn(opt.value)}
                  />{' '}
                  {opt.label}
                </label>
              ))}
            </fieldset>

            <label>
              访问密码（可选，4–6 位数字）
              <input
                type="text"
                value={pin}
                onChange={e => setPin(e.target.value)}
                maxLength={6}
                inputMode="numeric"
                pattern="\d*"
              />
              {errors.pin && (
                <span style={{ color: '#c33' }}>{errors.pin}</span>
              )}
            </label>

            {errors.form && <p style={{ color: '#c33' }}>{errors.form}</p>}

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                取消
              </button>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '创建中…' : '创建并复制链接'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateShareDialog;
