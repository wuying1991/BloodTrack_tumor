import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useT } from '../../i18n/useT';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth/authService';
import { ApiError } from '../../services/api/apiClient';
import { translateApiError } from '../../services/api/errorMapper';
import './Auth.css';

const Login: React.FC = () => {
  const t = useT('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if redirected due to session expiry
  const searchParams = new URLSearchParams(location.search);
  const expired = searchParams.get('expired');
  const sessionExpiredMessage = expired ? t('login.sessionExpired') : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authService.login({ email, password });

      if (response.success && response.data) {
        const { accessToken, refreshToken, ...userData } = response.data;

        login(accessToken, refreshToken, userData as any);

        // Redirect to the page user tried to access, or dashboard
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setError(t('login.failedRetry'));
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(translateApiError(err));
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(t('login.failedCheck'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('login.title')}</h2>
        {sessionExpiredMessage && (
          <div className="auth-warning">{sessionExpiredMessage}</div>
        )}
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{t('login.emailLabel')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder={t('login.emailPlaceholder')}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('login.passwordLabel')}</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder={t('login.passwordPlaceholder')}
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(prev => !prev)}
                disabled={isLoading}
                aria-label={
                  showPassword ? t('login.hideAria') : t('login.showAria')
                }
              >
                {showPassword ? t('login.hide') : t('login.show')}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading}
          >
            {isLoading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        <div className="auth-footer">
          {t('login.footerPrefix')}{' '}
          <Link to="/register">{t('login.registerLink')}</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
