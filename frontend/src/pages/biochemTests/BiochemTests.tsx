import React, { useState } from 'react';
import { BiochemTest } from '../../types';
import BiochemForm from '../../components/biochem/BiochemForm';
import BiochemList from '../../components/biochem/BiochemList';
import biochemService from '../../services/biochem/biochemService';
import { ApiError } from '../../services/api/apiClient';
import { useT } from '../../i18n/useT';
import './BiochemTests.css';

type ViewMode = 'list' | 'add' | 'edit';

const BiochemTests: React.FC = () => {
  const t = useT('biochem');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTest, setEditingTest] = useState<BiochemTest | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const handleAddNew = () => {
    setEditingTest(undefined);
    setViewMode('add');
  };

  const handleEdit = (test: BiochemTest) => {
    setEditingTest(test);
    setViewMode('edit');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('deleteConfirm'))) {
      try {
        await biochemService.deleteBiochemTest(id);
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
      await biochemService.exportCsv();
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

  return (
    <div className="biochem-tests-page">
      <div className="page-header">
        <h1>{t('pageTitle')}</h1>
        {viewMode === 'list' && (
          <div className="page-header-actions">
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={isExporting}
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
          <BiochemList
            onEdit={handleEdit}
            onDelete={handleDelete}
            refreshTrigger={refreshTrigger}
          />
        )}

        {(viewMode === 'add' || viewMode === 'edit') && (
          <BiochemForm
            initialData={editingTest}
            onSubmitSuccess={handleSubmitSuccess}
            onCancel={handleCancel}
          />
        )}
      </div>

      <div className="info-cards">
        <div className="info-card">
          <h4>💡 提示</h4>
          <p>化疗期间定期检查肝肾功能，有助于早期发现药物性肝损伤和肾毒性。</p>
        </div>
        <div className="info-card">
          <h4>⚠️ 注意</h4>
          <p>如果检测结果显示异常指标，请及时咨询您的主治医生调整治疗方案。</p>
        </div>
      </div>
    </div>
  );
};

export default BiochemTests;
