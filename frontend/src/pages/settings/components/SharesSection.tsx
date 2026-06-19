import React, { useState, useEffect, useCallback } from 'react';
import shareService, {
  ShareListItem,
} from '../../../services/share/shareService';
import { ApiError } from '../../../services/api/apiClient';
import CreateShareDialog from './CreateShareDialog';

interface Props {
  /** 总开关 (settings.dataSharing.enabled) */
  sharingEnabled: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function describeExpiresAt(expiresAt: string | null): string {
  if (!expiresAt) return '永不过期';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return `已过期 (${formatDate(expiresAt)})`;
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return `${days} 天后过期 (${formatDate(expiresAt)})`;
}

function describeScope(s: ShareListItem['scope']): string {
  const parts: string[] = [];
  if (s.bloodTests) parts.push('血常规');
  if (s.chemoCycles) parts.push('化疗周期');
  if (s.analytics) parts.push('趋势分析');
  return parts.join('、');
}

const SharesSection: React.FC<Props> = ({ sharingEnabled }) => {
  const [shares, setShares] = useState<ShareListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await shareService.listShares();
      setShares(res.data);
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

  const handleRevoke = async (id: string) => {
    if (!window.confirm('撤销后链接将立即失效，无法恢复。继续？')) return;
    try {
      await shareService.deleteShare(id);
      await load();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('撤销失败');
    }
  };

  return (
    <section style={{ marginTop: 24 }}>
      <h3>我的分享链接</h3>

      <button
        type="button"
        onClick={() => setShowDialog(true)}
        disabled={!sharingEnabled}
        title={!sharingEnabled ? '请先开启数据共享' : ''}
      >
        + 创建分享链接
      </button>

      {loading && <p>加载中…</p>}
      {error && <p style={{ color: '#c33' }}>{error}</p>}

      {!loading && shares.length === 0 && (
        <p style={{ color: '#888' }}>还没有创建过分享链接。</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {shares.map(s => (
          <li
            key={s._id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 4,
              padding: 12,
              marginTop: 8,
            }}
          >
            <div>
              范围: {describeScope(s.scope)}
              {s.hasPin ? '   PIN: 已设置' : ''}
            </div>
            <div>有效期: {describeExpiresAt(s.expiresAt)}</div>
            <div>创建于: {formatDate(s.createdAt)}</div>
            <button
              onClick={() => handleRevoke(s._id)}
              style={{ marginTop: 8 }}
            >
              撤销
            </button>
          </li>
        ))}
      </ul>

      <CreateShareDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onCreated={load}
      />
    </section>
  );
};

export default SharesSection;
