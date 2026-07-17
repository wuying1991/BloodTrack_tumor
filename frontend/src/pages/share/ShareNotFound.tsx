import React from 'react';
import { useT } from '../../i18n/useT';

const ShareNotFound: React.FC = () => {
  const t = useT('share');
  return (
    <div className="shared-error-page">
      <h1>{t('notFoundTitle')}</h1>
      <p>{t('notFoundDesc')}</p>
    </div>
  );
};

export default ShareNotFound;
