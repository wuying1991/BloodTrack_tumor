import React from 'react';
import type { PublicBloodTest } from '../../../services/share/publicShareService';
import { getMyelosuppressionGrade } from '../../../utils/myelosuppression';
import { useT } from '../../../i18n/useT';

interface Props {
  tests: PublicBloodTest[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN');
}

const SharedBloodTestList: React.FC<Props> = ({ tests }) => {
  const t = useT('share');
  if (tests.length === 0) return <p>{t('noBloodTests')}</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>{t('date')}</th>
          <th>WBC</th>
          <th>RBC</th>
          <th>HGB</th>
          <th>PLT</th>
          <th>NEU (中性粒细胞)</th>
          <th>LYM (淋巴细胞)</th>
        </tr>
      </thead>
      <tbody>
        {tests.map(row => (
          <tr
            key={row._id}
            className={`shared-blood-row${row.isAbnormal ? ' is-abnormal' : ''}`}
          >
            <td data-label={t('date')}>{fmtDate(row.date)}</td>
            <td data-label="WBC">{row.wbc.toFixed(2)}</td>
            <td data-label="RBC">{row.rbc.toFixed(2)}</td>
            <td data-label="HGB">{row.hgb.toFixed(1)}</td>
            <td data-label="PLT">{row.plt.toFixed(1)}</td>
            <td data-label="NEU">
              {row.neu !== undefined && row.neu !== null ? row.neu.toFixed(2) : '-'}
              {(() => {
                const gradeInfo = getMyelosuppressionGrade(row.neu);
                if (gradeInfo && gradeInfo.grade > 0) {
                  return (
                    <span
                      className={`grade-badge ${gradeInfo.className}`}
                      style={{ marginLeft: 8, display: 'inline-block' }}
                    >
                      {gradeInfo.grade}级抑制
                    </span>
                  );
                }
                return null;
              })()}
            </td>
            <td data-label="LYM">
              {row.lym !== undefined && row.lym !== null ? row.lym.toFixed(2) : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SharedBloodTestList;
