import React from 'react';
import type { PublicBloodTest } from '../../../services/share/publicShareService';
import { getMyelosuppressionGrade } from '../../../utils/myelosuppression';

interface Props {
  tests: PublicBloodTest[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN');
}

const SharedBloodTestList: React.FC<Props> = ({ tests }) => {
  if (tests.length === 0) return <p>还没有血常规记录。</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>日期</th>
          <th>WBC</th>
          <th>RBC</th>
          <th>HGB</th>
          <th>PLT</th>
          <th>NEU (中性粒细胞)</th>
          <th>LYM (淋巴细胞)</th>
        </tr>
      </thead>
      <tbody>
        {tests.map(t => (
          <tr
            key={t._id}
            className={`shared-blood-row${t.isAbnormal ? ' is-abnormal' : ''}`}
          >
            <td data-label="日期">{fmtDate(t.date)}</td>
            <td data-label="WBC">{t.wbc.toFixed(2)}</td>
            <td data-label="RBC">{t.rbc.toFixed(2)}</td>
            <td data-label="HGB">{t.hgb.toFixed(1)}</td>
            <td data-label="PLT">{t.plt.toFixed(1)}</td>
            <td data-label="NEU">
              {t.neu !== undefined && t.neu !== null ? t.neu.toFixed(2) : '-'}
              {(() => {
                const gradeInfo = getMyelosuppressionGrade(t.neu);
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
              {t.lym !== undefined && t.lym !== null ? t.lym.toFixed(2) : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SharedBloodTestList;
