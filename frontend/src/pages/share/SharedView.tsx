import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import publicShareService, {
  PublicShareMeta,
  PublicBloodTest,
  PublicChemoCycle,
  PublicAnalytics,
} from '../../services/share/publicShareService';
import { PublicApiError } from '../../services/share/publicApiClient';
import { useT } from '../../i18n/useT';
import { formatDateTime } from '../../utils/formatDate';
import PinPrompt from './components/PinPrompt';
import SharedBloodTestList from './components/SharedBloodTestList';
import SharedChemoCycleList from './components/SharedChemoCycleList';
import SharedAnalytics from './components/SharedAnalytics';
import './SharedView.css';

type Phase = 'loading' | 'meta-error' | 'pin' | 'data';

const SharedView: React.FC = () => {
  const t = useT('share');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [meta, setMeta] = useState<PublicShareMeta | null>(null);
  const [, setPin] = useState<string | null>(null);
  const [bloodTests, setBloodTests] = useState<PublicBloodTest[] | null>(null);
  const [chemoCycles, setChemoCycles] = useState<PublicChemoCycle[] | null>(
    null
  );
  const [analytics, setAnalytics] = useState<PublicAnalytics | null>(null);
  const [dataError, setDataError] = useState('');

  const loadData = useCallback(
    async (m: PublicShareMeta, pinValue: string | null) => {
      const calls: Promise<void>[] = [];
      if (m.scope.bloodTests) {
        calls.push(
          publicShareService
            .getBloodTests(token!, pinValue ?? undefined)
            .then(r => setBloodTests(r.data))
        );
      }
      if (m.scope.chemoCycles) {
        calls.push(
          publicShareService
            .getChemoCycles(token!, pinValue ?? undefined)
            .then(r => setChemoCycles(r.data))
        );
      }
      if (m.scope.analytics) {
        calls.push(
          publicShareService
            .getAnalytics(token!, 'all', pinValue ?? undefined)
            .then(r => setAnalytics(r.data))
        );
      }
      try {
        await Promise.all(calls);
      } catch (err) {
        setDataError(
          err instanceof PublicApiError ? err.message : t('loadFailed')
        );
      } finally {
        setPhase('data');
      }
    },
    [token, t]
  );

  useEffect(() => {
    if (!token) return;
    publicShareService
      .getMeta(token)
      .then(res => {
        const m = res.data;
        setMeta(m);
        if (m.requiresPin) {
          const cached = sessionStorage.getItem(`share-pin-${token}`);
          if (cached) {
            setPin(cached);
            void loadData(m, cached);
          } else {
            setPhase('pin');
          }
        } else {
          void loadData(m, null);
        }
      })
      .catch(err => {
        if (err instanceof PublicApiError) {
          if (err.statusCode === 404) navigate('/share/not-found');
          else if (err.statusCode === 410) navigate(`/share/${token}/expired`);
          else setPhase('meta-error');
        } else {
          setPhase('meta-error');
        }
      });
  }, [token, navigate, loadData]);

  const handlePinSubmit = async (input: string) => {
    if (!token || !meta) return;
    await publicShareService.verifyPin(token, input);
    sessionStorage.setItem(`share-pin-${token}`, input);
    setPin(input);
    await loadData(meta, input);
  };

  if (phase === 'loading')
    return <div className="shared-error-page">{t('loading')}</div>;
  if (phase === 'meta-error')
    return (
      <div className="shared-error-page">
        {t('loadFailed')}
      </div>
    );
  if (phase === 'pin') return <PinPrompt onSubmit={handlePinSubmit} />;
  if (!meta) return null;

  const expiryLabel = meta.expiresAt
    ? t('expiresOn', { date: formatDateTime(meta.expiresAt) })
    : t('neverExpires');

  return (
    <div className="shared-view">
      <header className="shared-view-header">
        <div>
          <h1>{t('appTitle')}</h1>
          <h2>{t('ownerData', { name: meta.ownerName })}</h2>
        </div>
        <span className="shared-view-readonly-badge">{t('readOnlyBadge')}</span>
      </header>

      {dataError && <p style={{ color: '#c33' }}>{dataError}</p>}

      {meta.scope.analytics && analytics && (
        <section className="shared-view-section">
          <h2>{t('sectionAnalytics')}</h2>
          <SharedAnalytics data={analytics} />
        </section>
      )}

      {meta.scope.chemoCycles && chemoCycles && (
        <section className="shared-view-section">
          <h2>{t('sectionChemoCycles')}</h2>
          <SharedChemoCycleList cycles={chemoCycles} />
        </section>
      )}

      {meta.scope.bloodTests && bloodTests && (
        <section className="shared-view-section">
          <h2>{t('sectionBloodTests')}</h2>
          <SharedBloodTestList tests={bloodTests} />
        </section>
      )}

      <footer style={{ marginTop: 32, textAlign: 'center', color: '#888' }}>
        <p>{expiryLabel}</p>
        <p>{t('poweredBy')}</p>
      </footer>
    </div>
  );
};

export default SharedView;
