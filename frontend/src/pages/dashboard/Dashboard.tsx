import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BloodTest } from '../../types';
import bloodTestService from '../../services/bloodTest/bloodTestService';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

interface DashboardStats {
  totalTests: number;
  latestTestDate: string | null;
  abnormalCount: number;
  recentTests: BloodTest[];
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalTests: 0,
    latestTestDate: null,
    abnormalCount: 0,
    recentTests: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await bloodTestService.getBloodTests(1, 20);

      if (response.success) {
        const tests = response.data;
        const abnormalCount = tests.filter(t => t.isAbnormal).length;

        let latestTestDate: string | null = null;
        if (tests.length > 0) {
          const dates = tests.map(t => new Date(t.date).getTime());
          const latest = new Date(Math.max(...dates));
          latestTestDate = latest.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
        }

        setStats({
          totalTests: response.pagination.total,
          latestTestDate,
          abnormalCount,
          recentTests: tests.slice(0, 5),
        });
      }
    } catch {
      setError('加载失败，请检查网络连接后重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatValue = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    return value.toFixed(2);
  };

  const getAbnormalClass = (
    value: number | undefined,
    min: number,
    max: number
  ): string => {
    if (value === undefined || value === null) return '';
    if (value < min || value > max) return 'abnormal-value';
    return '';
  };

  if (isLoading) {
    return (
      <div className="dashboard loading">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard error">
        <div className="error-message">{error}</div>
        <button className="btn btn-secondary" onClick={fetchDashboardData}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>{user ? `${user.lastName}${user.firstName}，您好` : '仪表板'}</h1>
          <p className="welcome-subtitle">欢迎回到化疗血常规追踪器</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/blood-tests')}
          >
            添加记录
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/blood-tests')}
          >
            查看全部
          </button>
        </div>
      </div>

      {stats.totalTests === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>暂无血常规数据</h3>
          <p>开始记录您的第一次血常规检查，追踪化疗期间的健康变化</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/blood-tests')}
          >
            添加记录
          </button>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <span className="stat-value">{stats.totalTests}</span>
                <span className="stat-label">总记录数</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <span className="stat-value">
                  {stats.latestTestDate || '-'}
                </span>
                <span className="stat-label">最近检查</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <span className="stat-value">{stats.abnormalCount}</span>
                <span className="stat-label">异常指标记录</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👤</div>
              <div className="stat-content">
                <span className="stat-value">
                  {user ? user.lastName + user.firstName : '-'}
                </span>
                <span className="stat-label">当前用户</span>
              </div>
            </div>
          </div>

          <div className="recent-section">
            <h3>最近记录</h3>
            <div className="recent-table-wrapper">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>WBC</th>
                    <th>RBC</th>
                    <th>HGB</th>
                    <th>PLT</th>
                    <th>状态</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTests.map(test => (
                    <tr
                      key={test._id}
                      className={test.isAbnormal ? 'abnormal' : ''}
                    >
                      <td>{formatDate(test.date)}</td>
                      <td className={getAbnormalClass(test.wbc, 4.0, 10.0)}>
                        {formatValue(test.wbc)}
                      </td>
                      <td className={getAbnormalClass(test.rbc, 3.5, 5.8)}>
                        {formatValue(test.rbc)}
                      </td>
                      <td className={getAbnormalClass(test.hgb, 110, 165)}>
                        {formatValue(test.hgb)}
                      </td>
                      <td className={getAbnormalClass(test.plt, 100, 300)}>
                        {formatValue(test.plt)}
                      </td>
                      <td>
                        {test.isAbnormal ? (
                          <span className="badge badge-abnormal">异常</span>
                        ) : (
                          <span className="badge badge-normal">正常</span>
                        )}
                      </td>
                      <td className="notes-cell">{test.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
