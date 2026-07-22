import { ApiError } from '@/types/api';

/** Pick a user-facing message from API or unknown errors. */
export function getErrorMessage(err: unknown, fallback = '操作失败，请重试'): string {
  if (err instanceof ApiError) {
    if (err.errors) {
      const first = Object.values(err.errors)[0];
      if (first) return first;
    }
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
