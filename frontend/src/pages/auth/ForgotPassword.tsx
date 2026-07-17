import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/useT';
import authService from '../../services/auth/authService';
import './Auth.css';

const ForgotPassword: React.FC = () => {
  const t = useT('auth');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      await authService.forgotPassword(email);
      setMessage(t('forgot.success'));
    } catch {
      setError(t('forgot.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('forgot.title')}</h2>
        <p className="auth-desc">{t('forgot.desc')}</p>
        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{t('forgot.emailLabel')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder={t('forgot.emailPlaceholder')}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading}
          >
            {isLoading ? t('forgot.submitting') : t('forgot.submit')}
          </button>
        </form>
        <div className="auth-footer">
          <Link to="/login">{t('forgot.backToLogin')}</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
