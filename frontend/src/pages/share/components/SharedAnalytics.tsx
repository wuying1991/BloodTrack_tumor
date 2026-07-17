import React from 'react';
import type { PublicAnalytics } from '../../../services/share/publicShareService';
import { useT } from '../../../i18n/useT';

interface Props {
  data: PublicAnalytics;
}

const SharedAnalytics: React.FC<Props> = ({ data }) => {
  const t = useT('share');
  const { trends, summary } = data;
  return (
    <div>
      <p>
        {t('totalTests', { total: summary.totalTests, rate: summary.abnormalRate })}
      </p>
      {trends.length === 0 ? (
        <p>{t('noTrendData')}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>{t('date')}</th>
              <th>WBC</th>
              <th>RBC</th>
              <th>HGB</th>
              <th>PLT</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((row, i) => (
              <tr
                key={i}
                className={row.isAbnormal ? 'shared-blood-row is-abnormal' : ''}
              >
                <td>{row.date}</td>
                <td>{row.wbc}</td>
                <td>{row.rbc}</td>
                <td>{row.hgb}</td>
                <td>{row.plt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SharedAnalytics;
