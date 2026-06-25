import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth/authService';
import { ApiError } from '../../services/api/apiClient';
import './Auth.css';

const Register: React.FC = () => {
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
        confirmPassword: '两次输入的密码不一致 (Passwords do not match)',
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
        setError(
          '注册失败，请稍后重试。 (Registration failed, please try again later)'
        );
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setValidationErrors(err.errors);
        }
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
        if (err.response?.data?.errors) {
          setValidationErrors(err.response.data.errors);
        }
      } else {
        setError(
          '注册失败，请稍后重试。 (Registration failed, please try again later)'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>注册</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">姓名</label>
            <input
              type="text"
              id="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="请输入您的姓名"
              disabled={isLoading}
              className={validationErrors.fullName ? 'input-error' : ''}
            />
            {validationErrors.fullName && (
              <span className="field-error">{validationErrors.fullName}</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="email">电子邮箱</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="请输入您的邮箱"
              disabled={isLoading}
              className={validationErrors.email ? 'input-error' : ''}
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="请输入密码"
                disabled={isLoading}
                className={validationErrors.password ? 'input-error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(prev => !prev)}
                disabled={isLoading}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? '隐藏' : '显示'}
              </button>
            </div>
            <p className="password-hint">
              密码至少 6 位，且必须同时包含大写字母、小写字母和数字。
            </p>
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">确认密码</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="请再次输入密码"
                disabled={isLoading}
                className={validationErrors.confirmPassword ? 'input-error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(prev => !prev)}
                disabled={isLoading}
                aria-label={showConfirmPassword ? '隐藏确认密码' : '显示确认密码'}
              >
                {showConfirmPassword ? '隐藏' : '显示'}
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
            {isLoading ? '注册中... (Registering...)' : '注册'}
          </button>
        </form>
        <div className="auth-footer">
          已有账号？ <Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
