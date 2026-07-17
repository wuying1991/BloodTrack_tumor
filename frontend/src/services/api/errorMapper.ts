import i18n from '../../i18n';
import { ApiError } from './apiClient';

/**
 * 把后端 ApiError 翻译成当前语言的文案。
 * 优先用 error.code 在 errors 命名空间查翻译；命中失败回退到 error.message（后端双语/EN 兜底）。
 */
export function translateApiError(error: unknown): string {
  if (error instanceof ApiError && error.code) {
    const t = i18n.getFixedT(null, 'errors');
    const translated = t(error.code);
    if (translated !== error.code) return translated;
  }
  if (error instanceof Error) return error.message;
  return '';
}

/**
 * 字段级校验错误翻译。优先 errorCodes[field] -> errors 命名空间翻译；
 * 回退到 errors[field]（后端双语 message）。
 */
export function translateFieldError(
  error: unknown,
  field: string
): string | undefined {
  if (error instanceof ApiError) {
    if (error.errorCodes?.[field]) {
      const t = i18n.getFixedT(null, 'errors');
      const translated = t(error.errorCodes[field]);
      if (translated !== error.errorCodes[field]) return translated;
    }
    return error.errors?.[field];
  }
  return undefined;
}
