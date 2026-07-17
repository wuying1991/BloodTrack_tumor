import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

/**
 * 语言检测优先级:
 * 1. localStorage['lang']  -- 用户手动切换的标记，最高优先
 * 2. localStorage['user'].settings.language  -- 回访用户，AuthContext 挂载前
 * 3. navigator.language  -- 浏览器语言
 * 4. 'zh-CN'  -- 默认
 */
function detectLanguage(): string {
  try {
    const manual = localStorage.getItem('lang');
    if (manual === 'zh-CN' || manual === 'en-US') return manual;
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (
      u?.settings?.language === 'zh-CN' ||
      u?.settings?.language === 'en-US'
    ) {
      return u.settings.language;
    }
  } catch {
    /* ignore malformed storage */
  }
  return navigator.language?.startsWith('en') ? 'en-US' : 'zh-CN';
}

void i18next.use(initReactI18next).init({
  resources: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  lng: detectLanguage(),
  fallbackLng: 'zh-CN',
  ns: [
    'common',
    'errors',
    'layout',
    'auth',
    'dashboard',
    'bloodTest',
    'chemoCycle',
    'analytics',
    'reminders',
    'settings',
    'share',
    'myelosuppression',
    'audit',
  ],
  defaultNS: 'common',
  react: { useSuspense: false },
  initImmediate: false, // 同步初始化，测试渲染必需
  interpolation: { escapeValue: false },
});

export default i18next;
