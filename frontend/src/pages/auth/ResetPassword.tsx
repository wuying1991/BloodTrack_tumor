import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useT } from '../../i18n/useT';
import authService from '../../services/auth/authService';
import './Auth.css';

const ResetPassword: React.FC = () => {
  const t = useT('auth');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('reset.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('reset.passwordTooShort'));
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, password);
      setMessage(t('reset.success'));
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError(t('reset.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>{t('reset.invalidTitle')}</h2>
          <div className="auth-error">{t('reset.invalidDesc')}</div>
          <div className="auth-footer">
            <Link to="/forgot-password">{t('reset.reapply')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('reset.title')}</h2>
        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">{t('reset.passwordLabel')}</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder={t('reset.passwordPlaceholder')}
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">{t('reset.confirmLabel')}</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder={t('reset.confirmPlaceholder')}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isLoading}
            >
              {isLoading ? t('reset.submitting') : t('reset.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
