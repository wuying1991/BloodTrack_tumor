import React, { useState, useEffect, useCallback } from 'react';
import shareService, {
  ShareListItem,
} from '../../../services/share/shareService';
import { ApiError } from '../../../services/api/apiClient';
import { useT } from '../../../i18n/useT';
import CreateShareDialog from './CreateShareDialog';

interface Props {
  sharingEnabled: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

const SharesSection: React.FC<Props> = ({ sharingEnabled }) => {
  const t = useT('share');
  const [shares, setShares] = useState<ShareListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  const describeExpiresAt = (expiresAt: string | null): string => {
    if (!expiresAt) return t('neverExpires');
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return `${t('expiredShort')} (${formatDate(expiresAt)})`;
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return `${t('expiresInDays', { days })} (${formatDate(expiresAt)})`;
  };

  const describeScope = (s: ShareListItem['scope']): string => {
    const parts: string[] = [];
    if (s.bloodTests) parts.push(t('sectionBloodTests'));
    if (s.chemoCycles) parts.push(t('sectionChemoCycles'));
    if (s.analytics) parts.push(t('sectionAnalytics'));
    return parts.join('、');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await shareService.listShares();
      setShares(res.data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevoke = async (id: string) => {
    if (!window.confirm(t('revokeConfirm'))) return;
    try {
      await shareService.deleteShare(id);
      await load();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert(t('revokeFailed'));
    }
  };

  return (
    <section style={{ marginTop: 24 }}>
      <h3>{t('myShares')}</h3>

      <button
        type="button"
        onClick={() => setShowDialog(true)}
        disabled={!sharingEnabled}
        title={!sharingEnabled ? t('enableSharingFirst') : ''}
      >
        {t('createShareLink')}
      </button>

      {loading && <p>{t('loading')}</p>}
      {error && <p style={{ color: '#c33' }}>{error}</p>}

      {!loading && shares.length === 0 && (
        <p style={{ color: '#888' }}>{t('noShares')}</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {shares.map(s => (
          <li key={s._id} style={{ border: '1px solid #ddd', borderRadius: 4, padding: 12, marginTop: 8 }}>
            <div>
              {t('scope')}: {describeScope(s.scope)}
              {s.hasPin ? `   ${t('pinSet')}` : ''}
            </div>
            <div>{t('expiry')}: {describeExpiresAt(s.expiresAt)}</div>
            <div>{t('createdAtLabel')}: {formatDate(s.createdAt)}</div>
            <button onClick={() => handleRevoke(s._id)} style={{ marginTop: 8 }}>
              {t('revoke')}
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
