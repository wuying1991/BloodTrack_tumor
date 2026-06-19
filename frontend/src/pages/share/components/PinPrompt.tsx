import React, { useState } from 'react';

interface Props {
  onSubmit: (pin: string) => Promise<void>;
}

const PinPrompt: React.FC<Props> = ({ onSubmit }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) {
      setError('请输入 4–6 位数字 PIN');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(pin);
    } catch (err: any) {
      if (err?.statusCode === 429) {
        setError('尝试过多，请稍后再试');
      } else {
        setError('密码错误');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="shared-error-page">
      <h2>请输入访问密码</h2>
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
        {submitting ? '验证中…' : '查看'}
      </button>
    </form>
  );
};

export default PinPrompt;
