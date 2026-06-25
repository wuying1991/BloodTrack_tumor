import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth/authService';
import { ApiError } from '../../services/api/apiClient';
import './Auth.css';

const Login: React.FC = () => {
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
  const sessionExpiredMessage = expired
    ? '会话已过期，请重新登录。 (Session expired, please login again)'
    : '';

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
        setError(
          '登录失败，请稍后重试。 (Login failed, please try again later)'
        );
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(
          '登录失败，请检查您的邮箱和密码。 (Login failed, please check your email and password)'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>登录</h2>
        {sessionExpiredMessage && (
          <div className="auth-warning">{sessionExpiredMessage}</div>
        )}
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">电子邮箱</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="请输入您的邮箱"
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="请输入您的密码"
                disabled={isLoading}
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
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading}
          >
            {isLoading ? '登录中... (Logging in...)' : '登录'}
          </button>
        </form>
        <div className="auth-footer">
          还没有账号？ <Link to="/register">立即注册</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
