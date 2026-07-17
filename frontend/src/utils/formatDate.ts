import i18n from '../i18n';

/**
 * 随当前 i18n 语言本地化的日期格式化。
 * 切换语言后 (i18n.changeLanguage) 自动跟随。
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(i18n.language);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(i18n.language);
}

/** Dashboard 风格：yyyy/MM/dd */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** 提醒风格：月/日 时:分 */
export function formatDateTimeShort(iso: string): string {
  return new Date(iso).toLocaleString(i18n.language, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
