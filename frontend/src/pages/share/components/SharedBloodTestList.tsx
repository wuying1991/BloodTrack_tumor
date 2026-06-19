import React from 'react';
import type { PublicBloodTest } from '../../../services/share/publicShareService';

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
          <th>NEU</th>
          <th>LYM</th>
        </tr>
      </thead>
      <tbody>
        {tests.map(t => (
          <tr
            key={t._id}
            className={`shared-blood-row${t.isAbnormal ? ' is-abnormal' : ''}`}
          >
            <td>{fmtDate(t.date)}</td>
            <td>{t.wbc}</td>
            <td>{t.rbc}</td>
            <td>{t.hgb}</td>
            <td>{t.plt}</td>
            <td>{t.neu ?? '-'}</td>
            <td>{t.lym ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SharedBloodTestList;
