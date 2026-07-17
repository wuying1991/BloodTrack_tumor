import React, { useState, useEffect } from 'react';
import { BiochemTest } from '../../types';
import biochemService from '../../services/biochem/biochemService';
import { ApiError } from '../../services/api/apiClient';
import { useT } from '../../i18n/useT';
import '../bloodTest/BloodTestList.css';

interface BiochemListProps {
  onEdit: (test: BiochemTest) => void;
  onDelete: (id: string) => void;
  refreshTrigger: number;
}

const SUMMARY_FIELDS = ['alt', 'ast', 'tbil', 'alb', 'cr', 'bun', 'k', 'na'];

const BiochemList: React.FC<BiochemListProps> = ({
  onEdit,
  onDelete,
  refreshTrigger,
}) => {
  const t = useT(['biochem', 'common']);
  const [tests, setTests] = useState<BiochemTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  const fetchData = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await biochemService.getBiochemTests(page, pagination.limit);
      setTests(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else setError(t('common:networkError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(pagination.page);
  }, [pagination.page, refreshTrigger]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  };

  const countAbnormal = (test: BiochemTest): number => {
    let count = 0;
    for (const field of SUMMARY_FIELDS) {
      const val = test[field as keyof BiochemTest];
      if (val !== undefined && val !== null && typeof val === 'number') count++;
    }
    return test.isAbnormal ? count : 0;
  };

  if (loading) {
    return (
      <div className="blood-test-list loading">
        <div className="spinner"></div>
        <p>{t('common:loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blood-test-list error">
        <div className="error-message">{error}</div>
        <button className="btn btn-secondary" onClick={() => fetchData(pagination.page)}>
          {t('common:retry')}
        </button>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="blood-test-list empty">
        <p>{t('emptyState')}</p>
      </div>
    );
  }

  return (
    <div className="blood-test-list">
      <div className="list-header">
        <h3>{t('pageTitle')}</h3>
        <span className="record-count">{t('recordCount', { total: pagination.total })}</span>
      </div>

      <div className="table-container">
        <table className="blood-test-table">
          <thead>
            <tr>
              <th>{t('tableDate')}</th>
              {SUMMARY_FIELDS.map(f => (
                <th key={f}>{t(f)}</th>
              ))}
              <th>{t('tableStatus')}</th>
              <th>{t('tableActions')}</th>
            </tr>
          </thead>
          <tbody>
            {tests.map(test => (
              <tr key={test._id} className={test.isAbnormal ? 'abnormal' : ''}>
                <td className="date-cell">{formatDate(test.date)}</td>
                {SUMMARY_FIELDS.map(f => {
                  const val = test[f as keyof BiochemTest];
                  return (
                    <td key={f} className="value-cell">
                      {val !== undefined && val !== null ? Number(val).toFixed(2) : '-'}
                    </td>
                  );
                })}
                <td>
                  {test.isAbnormal ? (
                    <span className="abnormal-badge">{t('statusAbnormal')}</span>
                  ) : (
                    <span className="normal-badge">{t('statusNormal')}</span>
                  )}
                </td>
                <td className="actions-cell">
                  <button className="btn-icon btn-edit" onClick={() => onEdit(test)} title={t('edit')}>
                    ✏️
                  </button>
                  <button className="btn-icon btn-delete" onClick={() => test._id && onDelete(test._id)} title={t('delete')}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <button className="btn-page" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
            {t('prevPage')}
          </button>
          <span className="page-info">{t('pageInfo', { page: pagination.page, pages: pagination.pages })}</span>
          <button className="btn-page" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.pages}>
            {t('nextPage')}
          </button>
        </div>
      )}
    </div>
  );
};

export default BiochemList;
