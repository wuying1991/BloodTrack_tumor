import React, { useState, useEffect } from 'react';
import { BloodTest } from '../../types';
import bloodTestService from '../../services/bloodTest/bloodTestService';
import { ApiError } from '../../services/api/apiClient';
import './BloodTestList.css';

interface BloodTestListProps {
  onEdit: (bloodTest: BloodTest) => void;
  onDelete: (id: string) => void;
  refreshTrigger: number;
}

const BloodTestList: React.FC<BloodTestListProps> = ({
  onEdit,
  onDelete,
  refreshTrigger,
}) => {
  const [bloodTests, setBloodTests] = useState<BloodTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchBloodTests = async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const response = await bloodTestService.getBloodTests(
        page,
        pagination.limit
      );
      setBloodTests(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('加载血常规记录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBloodTests(pagination.page);
  }, [pagination.page, refreshTrigger]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const renderValue = (value: number | undefined, unit: string): string => {
    if (value === undefined || value === null) return '-';
    return `${value.toFixed(2)} ${unit}`;
  };

  const getAbnormalIndicator = (
    value: number | undefined,
    min: number,
    max: number
  ): string => {
    if (value === undefined || value === null) return '';
    if (value < min) return '↓';
    if (value > max) return '↑';
    return '';
  };

  if (loading) {
    return (
      <div className="blood-test-list loading">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blood-test-list error">
        <div className="error-message">{error}</div>
        <button
          className="btn btn-secondary"
          onClick={() => fetchBloodTests(pagination.page)}
        >
          重试
        </button>
      </div>
    );
  }

  if (bloodTests.length === 0) {
    return (
      <div className="blood-test-list empty">
        <p>暂无血常规记录</p>
        <p className="empty-hint">点击上方的"添加记录"按钮创建您的第一条记录</p>
      </div>
    );
  }

  return (
    <div className="blood-test-list">
      <div className="list-header">
        <h3>血常规记录列表</h3>
        <span className="record-count">共 {pagination.total} 条记录</span>
      </div>

      <div className="table-container">
        <table className="blood-test-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>
                白细胞
                <br />
                <small>(×10⁹/L)</small>
              </th>
              <th>
                红细胞
                <br />
                <small>(×10¹²/L)</small>
              </th>
              <th>
                血红蛋白
                <br />
                <small>(g/L)</small>
              </th>
              <th>
                血小板
                <br />
                <small>(×10⁹/L)</small>
              </th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {bloodTests.map(test => (
              <tr key={test._id} className={test.isAbnormal ? 'abnormal' : ''}>
                <td className="date-cell">
                  {formatDate(test.date)}
                  {test.isAbnormal && (
                    <span className="abnormal-badge">异常</span>
                  )}
                </td>
                <td
                  className={`value-cell ${
                    getAbnormalIndicator(test.wbc, 4.0, 10.0)
                      ? 'abnormal-value'
                      : ''
                  }`}
                >
                  {renderValue(test.wbc, '')}
                  {getAbnormalIndicator(test.wbc, 4.0, 10.0)}
                </td>
                <td
                  className={`value-cell ${
                    getAbnormalIndicator(test.rbc, 3.5, 5.8)
                      ? 'abnormal-value'
                      : ''
                  }`}
                >
                  {renderValue(test.rbc, '')}
                  {getAbnormalIndicator(test.rbc, 3.5, 5.8)}
                </td>
                <td
                  className={`value-cell ${
                    getAbnormalIndicator(test.hgb, 110, 165)
                      ? 'abnormal-value'
                      : ''
                  }`}
                >
                  {renderValue(test.hgb, '')}
                  {getAbnormalIndicator(test.hgb, 110, 165)}
                </td>
                <td
                  className={`value-cell ${
                    getAbnormalIndicator(test.plt, 100, 300)
                      ? 'abnormal-value'
                      : ''
                  }`}
                >
                  {renderValue(test.plt, '')}
                  {getAbnormalIndicator(test.plt, 100, 300)}
                </td>
                <td className="notes-cell" title={test.notes || ''}>
                  {test.notes
                    ? test.notes.length > 20
                      ? `${test.notes.substring(0, 20)}...`
                      : test.notes
                    : '-'}
                </td>
                <td className="actions-cell">
                  <button
                    className="btn-icon btn-edit"
                    onClick={() => onEdit(test)}
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => test._id && onDelete(test._id)}
                    title="删除"
                  >
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
          <button
            className="btn-page"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            上一页
          </button>
          <span className="page-info">
            第 {pagination.page} / {pagination.pages} 页
          </span>
          <button
            className="btn-page"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
          >
            下一页
          </button>
        </div>
      )}

      <div className="list-legend">
        <p>
          <span className="legend-abnormal">异常</span> 表示数值超出正常范围
          <span className="legend-arrows">↑</span> 高于正常值
          <span className="legend-arrows">↓</span> 低于正常值
        </p>
      </div>
    </div>
  );
};

export default BloodTestList;
