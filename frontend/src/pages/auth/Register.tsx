import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useT } from '../../i18n/useT';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth/authService';
import { ApiError } from '../../services/api/apiClient';
import {
  translateApiError,
  translateFieldError,
} from '../../services/api/errorMapper';
import './Auth.css';

const Register: React.FC = () => {
  const t = useT('auth');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[id]) {
      setValidationErrors(prev => ({ ...prev, [id]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setValidationErrors({
        confirmPassword: t('register.passwordMismatch'),
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
      });

      if (response.success && response.data) {
        const { accessToken, refreshToken, ...userData } = response.data;
        login(accessToken, refreshToken, userData as any);
        navigate('/dashboard');
      } else {
        setError(t('register.failedRetry'));
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(translateApiError(err));
        if (err.errors || err.errorCodes) {
          const fields = Array.from(
            new Set([
              ...Object.keys(err.errors || {}),
              ...Object.keys(err.errorCodes || {}),
            ])
          );
          const map: Record<string, string> = {};
          fields.forEach(f => {
            const m = translateFieldError(err, f);
            if (m) map[f] = m;
          });
          if (Object.keys(map).length > 0) setValidationErrors(map);
        }
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
        if (err.response?.data?.errors) {
          setValidationErrors(err.response.data.errors);
        }
      } else {
        setError(t('register.failedRetry'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('register.title')}</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">{t('register.fullNameLabel')}</label>
            <input
              type="text"
              id="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder={t('register.fullNamePlaceholder')}
              disabled={isLoading}
              className={validationErrors.fullName ? 'input-error' : ''}
            />
            {validationErrors.fullName && (
              <span className="field-error">{validationErrors.fullName}</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="email">{t('register.emailLabel')}</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder={t('register.emailPlaceholder')}
              disabled={isLoading}
              className={validationErrors.email ? 'input-error' : ''}
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('register.passwordLabel')}</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder={t('register.passwordPlaceholder')}
                disabled={isLoading}
                className={validationErrors.password ? 'input-error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(prev => !prev)}
                disabled={isLoading}
                aria-label={
                  showPassword ? t('register.hideAria') : t('register.showAria')
                }
              >
                {showPassword ? t('register.hide') : t('register.show')}
              </button>
            </div>
            <p className="password-hint">{t('register.passwordHint')}</p>
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">
              {t('register.confirmLabel')}
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder={t('register.confirmPlaceholder')}
                disabled={isLoading}
                className={
                  validationErrors.confirmPassword ? 'input-error' : ''
                }
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(prev => !prev)}
                disabled={isLoading}
                aria-label={
                  showConfirmPassword
                    ? t('register.hideConfirmAria')
                    : t('register.showConfirmAria')
                }
              >
                {showConfirmPassword ? t('register.hide') : t('register.show')}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <span className="field-error">
                {validationErrors.confirmPassword}
              </span>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading}
          >
            {isLoading ? t('register.submitting') : t('register.submit')}
          </button>
        </form>
        <div className="auth-footer">
          {t('register.footerPrefix')}{' '}
          <Link to="/login">{t('register.loginLink')}</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
