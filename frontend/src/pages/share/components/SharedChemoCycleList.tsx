import React from 'react';
import type { PublicChemoCycle } from '../../../services/share/publicShareService';

interface Props {
  cycles: PublicChemoCycle[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN');
}

const SharedChemoCycleList: React.FC<Props> = ({ cycles }) => {
  if (cycles.length === 0) return <p>还没有化疗周期记录。</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {cycles.map(c => (
        <li
          key={c._id}
          style={{
            border: '1px solid #ddd',
            borderRadius: 4,
            padding: 12,
            marginBottom: 8,
          }}
        >
          <div>
            <strong>{fmtDate(c.startDate)}</strong> → {fmtDate(c.endDate)}
          </div>
          <div>
            药物:
            <ul>
              {c.medications.map((m, i) => (
                <li key={i}>
                  {m.name} · {m.dosage} · {m.schedule}
                </li>
              ))}
            </ul>
          </div>
          {c.doctorNotes && <div>医生备注: {c.doctorNotes}</div>}
        </li>
      ))}
    </ul>
  );
};

export default SharedChemoCycleList;
