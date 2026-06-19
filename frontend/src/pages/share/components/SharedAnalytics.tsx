import React from 'react';
import type { PublicAnalytics } from '../../../services/share/publicShareService';

interface Props {
  data: PublicAnalytics;
}

const SharedAnalytics: React.FC<Props> = ({ data }) => {
  const { trends, summary } = data;
  return (
    <div>
      <p>
        共 {summary.totalTests} 次检测，异常率 {summary.abnormalRate}%
      </p>
      {trends.length === 0 ? (
        <p>没有可用的趋势数据。</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>日期</th>
              <th>WBC</th>
              <th>RBC</th>
              <th>HGB</th>
              <th>PLT</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((t, i) => (
              <tr
                key={i}
                className={t.isAbnormal ? 'shared-blood-row is-abnormal' : ''}
              >
                <td>{t.date}</td>
                <td>{t.wbc}</td>
                <td>{t.rbc}</td>
                <td>{t.hgb}</td>
                <td>{t.plt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SharedAnalytics;
