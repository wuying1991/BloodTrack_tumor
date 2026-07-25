export function devOnlyValue(
  value: string | undefined,
  isDevelopment: boolean
): string {
  return isDevelopment ? value || '' : '';
}

export function isDevFeatureEnabled(isDevelopment: boolean): boolean {
  return isDevelopment;
}
