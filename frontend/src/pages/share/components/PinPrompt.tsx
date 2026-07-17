import React, { useState } from 'react';
import { useT } from '../../../i18n/useT';

interface Props {
  onSubmit: (pin: string) => Promise<void>;
}

const PinPrompt: React.FC<Props> = ({ onSubmit }) => {
  const t = useT('share');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) {
      setError(t('pinFormatError'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(pin);
    } catch (err: any) {
      if (err?.statusCode === 429) {
        setError(t('pinTooMany'));
      } else {
        setError(t('pinWrong'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="shared-error-page">
      <h2>{t('pinTitle')}</h2>
      <input
        type="text"
        value={pin}
        onChange={e => setPin(e.target.value)}
        maxLength={6}
        inputMode="numeric"
        pattern="\d*"
        autoFocus
      />
      {error && <p style={{ color: '#c33' }}>{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? t('pinVerifying') : t('pinSubmit')}
      </button>
    </form>
  );
};

export default PinPrompt;
