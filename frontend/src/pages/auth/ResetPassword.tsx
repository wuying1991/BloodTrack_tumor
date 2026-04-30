import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import authService from '../../services/auth/authService';
import './Auth.css';

const ResetPassword: React.FC = () => {
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
      setError('两次输入的密码不一致 (Passwords do not match)');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符 (Password must be at least 6 characters)');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, password);
      setMessage('密码已成功重置！即将跳转到登录页面...');
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError(
        '重置失败，令牌可能已过期 (Reset failed, token may have expired)'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>无效链接</h2>
          <div className="auth-error">重置链接无效，请重新申请密码重置</div>
          <div className="auth-footer">
            <Link to="/forgot-password">重新申请</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>重置密码</h2>
        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">新密码</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="请输入新密码（至少6个字符）"
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="请再次输入新密码"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isLoading}
            >
              {isLoading ? '重置中...' : '重置密码'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
