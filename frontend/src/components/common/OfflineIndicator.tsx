import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const OfflineIndicator: React.FC = () => {
  const { t } = useTranslation('layout');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      {t('offline')}
    </div>
  );
};

export default OfflineIndicator;
