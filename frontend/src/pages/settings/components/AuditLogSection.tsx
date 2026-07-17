import React, { useState, useEffect, useCallback } from 'react';
import auditLogService from '../../../services/auth/auditLogService';
import type { AuditLogEntry, AuditAction } from '../../../types';
import { ApiError } from '../../../services/api/apiClient';
import { useT } from '../../../i18n/useT';

const ACTION_KEYS: Record<AuditAction, string> = {
  login: 'actionLogin',
  logout: 'actionLogout',
  register: 'actionRegister',
  refresh_token: 'actionRefreshToken',
  forgot_password: 'actionForgotPassword',
  reset_password: 'actionResetPassword',
  change_password: 'actionChangePassword',
  delete_account: 'actionDeleteAccount',
  share_create: 'actionShareCreate',
  share_revoke: 'actionShareRevoke',
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
  const t = useT('settings');
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
      else setError(t('auditLogError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section>
      <h3>{t('auditLogTitle')}</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
        {t('auditLogDesc')}
      </p>

      {loading && <p>{t('auditLogLoading')}</p>}
      {error && <p style={{ color: '#d0021b' }}>{error}</p>}

      {!loading && logs.length === 0 && (
        <p style={{ color: '#888' }}>{t('auditLogEmpty')}</p>
      )}

      {!loading && logs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                borderLeft: log.isAnomaly ? '3px solid #dc2626' : '3px solid #cbd5e1',
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                {log.isAnomaly ? '⚠️' : log.success ? '✅' : '❌'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong>{t(ACTION_KEYS[log.action] || log.action)}</strong>
                  <span style={{ color: '#666', fontSize: '0.85rem' }}>
                    {formatTime(log.createdAt)}
                  </span>
                  {log.isAnomaly && (
                    <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                      {t('auditAnomaly')}
                    </span>
                  )}
                </div>
                <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  {t('auditIp')}: {log.ip || '-'} · {t('auditBrowser')}: {shortenUA(log.userAgent)}
                </div>
                {log.detail && (
                  <div style={{ color: '#555', fontSize: '0.85rem', marginTop: '0.2rem' }}>
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
