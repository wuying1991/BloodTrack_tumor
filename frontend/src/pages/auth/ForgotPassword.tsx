import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/auth/authService';
import './Auth.css';

const ForgotPassword: React.FC = () => {
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
      setMessage(
        '如果该邮箱已注册，密码重置链接已发送 (If email exists, reset link has been sent)'
      );
    } catch {
      setError('发送失败，请稍后重试 (Failed to send, please try again later)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>忘记密码</h2>
        <p className="auth-desc">输入您的注册邮箱，我们将发送密码重置链接</p>
        {message && <div className="auth-success">{message}</div>}
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
              placeholder="请输入您的注册邮箱"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading}
          >
            {isLoading ? '发送中...' : '发送重置链接'}
          </button>
        </form>
        <div className="auth-footer">
          <Link to="/login">返回登录</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
