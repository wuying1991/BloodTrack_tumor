import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BloodTest } from '../../types';
import BloodTestForm from '../../components/bloodTest/BloodTestForm';
import BloodTestList from '../../components/bloodTest/BloodTestList';
import bloodTestService, {
  BloodTestFormData,
} from '../../services/bloodTest/bloodTestService';
import chemoCycleService from '../../services/chemoCycle/chemoCycleService';
import { ApiError } from '../../services/api/apiClient';
import { useT } from '../../i18n/useT';
import './BloodTests.css';

const CYCLE_WARNING_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;

type ViewMode = 'list' | 'add' | 'edit';

const BloodTests: React.FC = () => {
  const t = useT('bloodTests');
  const navigate = useNavigate();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTest, setEditingTest] = useState<BloodTest | undefined>(undefined);

  React.useEffect(() => {
    if (location.state && (location.state as any).addNew) {
      setViewMode('add');
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const handleAddNew = () => {
    setEditingTest(undefined);
    setViewMode('add');
  };

  const handleEdit = (bloodTest: BloodTest) => {
    setEditingTest(bloodTest);
    setViewMode('edit');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('deleteConfirm'))) {
      try {
        await bloodTestService.deleteBloodTest(id);
        setRefreshTrigger(prev => prev + 1);
      } catch (err: unknown) {
        const msg = err instanceof ApiError ? err.message : t('retry');
        alert(t('deleteFailed', { msg }));
      }
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await bloodTestService.exportCsv();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : t('exportFailed');
      alert(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubmitSuccess = () => {
    setViewMode('list');
    setEditingTest(undefined);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingTest(undefined);
  };

  const beforeBloodTestSubmit = async (
    data: BloodTestFormData
  ): Promise<'continue' | 'cancel'> => {
    if (editingTest) return 'continue';

    try {
      const res = await chemoCycleService.getChemoCycles(1, 100);
      const cycles = res.data || [];
      if (cycles.length === 0) {
        const goAddCycle = window.confirm(t('cycleWarningNone'));
        if (goAddCycle) {
          navigate('/chemo-cycles');
          return 'cancel';
        }
        return 'continue';
      }

      const latest = [...cycles].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      )[0];
      const testDate = new Date(data.date).getTime();
      const latestStart = new Date(latest.startDate).getTime();
      if (testDate - latestStart > CYCLE_WARNING_DAYS * DAY_MS) {
        const goAddCycle = window.confirm(t('cycleWarningOld'));
        if (goAddCycle) {
          navigate('/chemo-cycles');
          return 'cancel';
        }
      }
    } catch {
      return 'continue';
    }

    return 'continue';
  };

  return (
    <div className="blood-tests-page">
      <div className="page-header">
        <h1>{t('pageTitle')}</h1>
        {viewMode === 'list' && (
          <div className="page-header-actions">
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={isExporting}
              title={t('exportCsv')}
            >
              {isExporting ? t('exporting') : t('exportCsv')}
            </button>
            <button className="btn btn-primary" onClick={handleAddNew}>
              {t('addRecord')}
            </button>
          </div>
        )}
      </div>

      <div className="page-content">
        {viewMode === 'list' && (
          <BloodTestList onEdit={handleEdit} onDelete={handleDelete} refreshTrigger={refreshTrigger} />
        )}

        {(viewMode === 'add' || viewMode === 'edit') && (
          <BloodTestForm
            initialData={editingTest}
            onSubmitSuccess={handleSubmitSuccess}
            onCancel={handleCancel}
            beforeSubmit={beforeBloodTestSubmit}
          />
        )}
      </div>

      <div className="info-cards">
        <div className="info-card">
          <h4>{t('tipTitle')}</h4>
          <p>{t('tipContent')}</p>
        </div>
        <div className="info-card">
          <h4>{t('warningTitle')}</h4>
          <p>{t('warningContent')}</p>
        </div>
        <div className="info-card">
          <h4>{t('dataSecurityTitle')}</h4>
          <p>{t('dataSecurityContent')}</p>
        </div>
      </div>
    </div>
  );
};

export default BloodTests;
