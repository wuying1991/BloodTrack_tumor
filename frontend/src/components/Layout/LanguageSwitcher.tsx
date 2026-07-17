import React from 'react';
import { useTranslation } from 'react-i18next';
import authService from '../../services/auth/authService';
import './LanguageSwitcher.css';

const LANGS: Array<{ code: 'zh-CN' | 'en-US'; label: string }> = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en-US', label: 'English' },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const handleChange = (code: 'zh-CN' | 'en-US') => {
    if (code === i18n.language) return;
    void i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
    // 已登录则同步到后端 (跨设备)。fire-and-forget，失败不影响 UI。
    const token = localStorage.getItem('authToken');
    if (token) {
      void authService.updateSettings({ language: code }).catch(() => {
        /* ignore */
      });
    }
  };

  return (
    <div className="language-switcher" role="group" aria-label="Language">
      {LANGS.map(l => (
        <button
          key={l.code}
          type="button"
          className={`lang-btn ${i18n.language === l.code ? 'active' : ''}`}
          onClick={() => handleChange(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
