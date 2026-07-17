import React, { useState } from 'react';
import shareService, {
  ShareCreatePayload,
  ShareExpiresIn,
  ShareScope,
} from '../../../services/share/shareService';
import { ApiError } from '../../../services/api/apiClient';
import { useT } from '../../../i18n/useT';
import './CreateShareDialog.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateShareDialog: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const t = useT(['share', 'common']);
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

  const expiresOptions: Array<{ value: ShareExpiresIn; labelKey: string }> = [
    { value: '1d', labelKey: 'expires1d' },
    { value: '7d', labelKey: 'expires7d' },
    { value: '30d', labelKey: 'expires30d' },
    { value: '90d', labelKey: 'expires90d' },
    { value: 'never', labelKey: 'expiresNever' },
  ];

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
      next.scope = t('scopeRequired');
    }
    if (pin && !/^\d{4,6}$/.test(pin)) {
      next.pin = t('pinFormatError');
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
        setCopyMessage(t('copiedToClipboard'));
      } catch {
        setCopyMessage(t('copyManually'));
      }
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ form: err.message });
      } else {
        setErrors({ form: t('createFailed') });
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
            <h3>{t('createSuccess')}</h3>
            <p>{copyMessage}</p>
            <pre style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 8 }}>
              {createdUrl}
            </pre>
            <p style={{ color: '#c33' }}>{t('linkOnceWarning')}</p>
            <button onClick={handleClose}>{t('done')}</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>{t('createShareLink')}</h3>

            <fieldset>
              <legend>{t('shareContent')}</legend>
              <label>
                <input type="checkbox" checked={scope.bloodTests} onChange={e => setScope({ ...scope, bloodTests: e.target.checked })} />{' '}
                {t('sectionBloodTests')}
              </label>
              <label>
                <input type="checkbox" checked={scope.chemoCycles} onChange={e => setScope({ ...scope, chemoCycles: e.target.checked })} />{' '}
                {t('sectionChemoCycles')}
              </label>
              <label>
                <input type="checkbox" checked={scope.analytics} onChange={e => setScope({ ...scope, analytics: e.target.checked })} />{' '}
                {t('sectionAnalytics')}
              </label>
              {errors.scope && <span style={{ color: '#c33' }}>{errors.scope}</span>}
            </fieldset>

            <fieldset>
              <legend>{t('expiryLegend')}</legend>
              {expiresOptions.map(opt => (
                <label key={opt.value}>
                  <input
                    type="radio"
                    name="expiresIn"
                    value={opt.value}
                    checked={expiresIn === opt.value}
                    onChange={() => setExpiresIn(opt.value)}
                  />{' '}
                  {t(opt.labelKey)}
                </label>
              ))}
            </fieldset>

            <label>
              {t('pinLabel')}
              <input
                type="text"
                value={pin}
                onChange={e => setPin(e.target.value)}
                maxLength={6}
                inputMode="numeric"
                pattern="\d*"
              />
              {errors.pin && <span style={{ color: '#c33' }}>{errors.pin}</span>}
            </label>

            {errors.form && <p style={{ color: '#c33' }}>{errors.form}</p>}

            <div style={{ marginTop: 12 }}>
              <button type="button" onClick={handleClose} disabled={isSubmitting}>
                {t('common:cancel')}
              </button>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('creating') : t('createAndCopy')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateShareDialog;
