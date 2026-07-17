import React from 'react';
import { useT } from '../../i18n/useT';

const ShareExpired: React.FC = () => {
  const t = useT('share');
  return (
    <div className="shared-error-page">
      <h1>{t('expiredTitle')}</h1>
      <p>{t('expiredDesc')}</p>
    </div>
  );
};

export default ShareExpired;
