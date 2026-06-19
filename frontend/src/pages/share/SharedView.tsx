import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import publicShareService, {
  PublicShareMeta,
  PublicBloodTest,
  PublicChemoCycle,
  PublicAnalytics,
} from '../../services/share/publicShareService';
import { PublicApiError } from '../../services/share/publicApiClient';
import PinPrompt from './components/PinPrompt';
import SharedBloodTestList from './components/SharedBloodTestList';
import SharedChemoCycleList from './components/SharedChemoCycleList';
import SharedAnalytics from './components/SharedAnalytics';
import './SharedView.css';

type Phase = 'loading' | 'meta-error' | 'pin' | 'data';

const SharedView: React.FC = () => {
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
          err instanceof PublicApiError ? err.message : '加载数据失败'
        );
      } finally {
        // 无论成功失败都进入 data phase, 让 header / dataError / 已加载的 section 都能渲染
        setPhase('data');
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    publicShareService
      .getMeta(token)
      .then(res => {
        const m = res.data;
        setMeta(m);
        if (m.requiresPin) {
          // 检查 sessionStorage 是否已有该 token 的 PIN
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
    return <div className="shared-error-page">加载中…</div>;
  if (phase === 'meta-error')
    return (
      <div className="shared-error-page">
        加载失败，请刷新页面或联系分享者。
      </div>
    );
  if (phase === 'pin') return <PinPrompt onSubmit={handlePinSubmit} />;
  if (!meta) return null;

  const expiryLabel = meta.expiresAt
    ? `链接将于 ${new Date(meta.expiresAt).toLocaleString('zh-CN')} 过期`
    : '链接长期有效';

  return (
    <div className="shared-view">
      <header className="shared-view-header">
        <div>
          <h1>化疗血常规追踪器</h1>
          <h2>{meta.ownerName} 的健康数据</h2>
        </div>
        <span className="shared-view-readonly-badge">🔒 只读视图</span>
      </header>

      {dataError && <p style={{ color: '#c33' }}>{dataError}</p>}

      {meta.scope.analytics && analytics && (
        <section className="shared-view-section">
          <h2>趋势分析</h2>
          <SharedAnalytics data={analytics} />
        </section>
      )}

      {meta.scope.chemoCycles && chemoCycles && (
        <section className="shared-view-section">
          <h2>化疗周期</h2>
          <SharedChemoCycleList cycles={chemoCycles} />
        </section>
      )}

      {meta.scope.bloodTests && bloodTests && (
        <section className="shared-view-section">
          <h2>血常规记录</h2>
          <SharedBloodTestList tests={bloodTests} />
        </section>
      )}

      <footer style={{ marginTop: 32, textAlign: 'center', color: '#888' }}>
        <p>{expiryLabel}</p>
        <p>Powered by 化疗血常规追踪器</p>
      </footer>
    </div>
  );
};

export default SharedView;
