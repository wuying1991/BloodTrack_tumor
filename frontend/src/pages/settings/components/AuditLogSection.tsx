import React, { useState, useEffect, useCallback } from 'react';
import auditLogService from '../../../services/auth/auditLogService';
import type { AuditLogEntry, AuditAction } from '../../../types';
import { ApiError } from '../../../services/api/apiClient';

const ACTION_LABELS: Record<AuditAction, string> = {
  login: '登录',
  logout: '登出',
  register: '注册',
  refresh_token: '刷新令牌',
  forgot_password: '忘记密码',
  reset_password: '重置密码',
  change_password: '修改密码',
  delete_account: '删除账户',
  share_create: '创建分享',
  share_revoke: '撤销分享',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortenUA(ua: string): string {
  if (!ua) return '-';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/')) return 'Safari';
  return ua.slice(0, 30);
}

const AuditLogSection: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await auditLogService.getLogs();
      setLogs(res.data || []);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section>
      <h3>安全日志</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
        以下是您账户最近的安全操作记录。异常事件（如新 IP
        登录、暴力破解尝试）会高亮显示。
      </p>

      {loading && <p>加载中…</p>}
      {error && <p style={{ color: '#d0021b' }}>{error}</p>}

      {!loading && logs.length === 0 && (
        <p style={{ color: '#888' }}>暂无安全日志记录。</p>
      )}

      {!loading && logs.length > 0 && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          {logs.map(log => (
            <div
              key={log._id}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: log.isAnomaly ? '#fff5f5' : '#f8fafc',
                borderLeft: log.isAnomaly
                  ? '3px solid #dc2626'
                  : '3px solid #cbd5e1',
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                {log.isAnomaly ? '⚠️' : log.success ? '✅' : '❌'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <strong>{ACTION_LABELS[log.action] || log.action}</strong>
                  <span style={{ color: '#666', fontSize: '0.85rem' }}>
                    {formatTime(log.createdAt)}
                  </span>
                  {log.isAnomaly && (
                    <span
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        fontSize: '0.75rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '3px',
                      }}
                    >
                      异常
                    </span>
                  )}
                </div>
                <div
                  style={{
                    color: '#666',
                    fontSize: '0.85rem',
                    marginTop: '0.2rem',
                  }}
                >
                  IP: {log.ip || '-'} · 浏览器: {shortenUA(log.userAgent)}
                </div>
                {log.detail && (
                  <div
                    style={{
                      color: '#555',
                      fontSize: '0.85rem',
                      marginTop: '0.2rem',
                    }}
                  >
                    {log.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default AuditLogSection;
