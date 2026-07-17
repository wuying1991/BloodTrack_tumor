import React from 'react';
import type { PublicChemoCycle } from '../../../services/share/publicShareService';
import { useT } from '../../../i18n/useT';

interface Props {
  cycles: PublicChemoCycle[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN');
}

const SharedChemoCycleList: React.FC<Props> = ({ cycles }) => {
  const t = useT('share');
  if (cycles.length === 0) return <p>{t('noChemoCycles')}</p>;
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
            <strong>{fmtDate(c.startDate)}</strong> {'->'} {fmtDate(c.endDate)}
          </div>
          <div>
            {t('medications')}
            <ul>
              {c.medications.map((m, i) => (
                <li key={i}>
                  {m.name} · {m.dosage} · {m.schedule}
                </li>
              ))}
            </ul>
          </div>
          {c.doctorNotes && <div>{t('doctorNotes')} {c.doctorNotes}</div>}
        </li>
      ))}
    </ul>
  );
};

export default SharedChemoCycleList;
