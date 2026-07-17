import { useTranslation } from 'react-i18next';

/**
 * 类型安全的翻译 hook。
 *
 * react-i18next v12 的 t() 默认返回 DefaultTFuncReturn (含 null)，
 * 赋给 string state/props 时 tsc 报错。此处收敛为 (key, options?) => string。
 * 需返回对象/数组（如 returnObjects）的场景仍用原生 useTranslation。
 */
export type TFunc = (key: string, options?: Record<string, unknown>) => string;

export function useT(namespace: string | string[]): TFunc {
  const { t } = useTranslation(namespace);
  return t as TFunc;
}
