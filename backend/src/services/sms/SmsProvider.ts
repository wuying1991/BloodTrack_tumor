export interface SmsProvider {
  sendLoginCode(phone: string, code: string): Promise<void>;
}

/** Dev/test: log to stdout, never calls external SMS. */
export class ConsoleSmsProvider implements SmsProvider {
  async sendLoginCode(phone: string, code: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[SMS:console] phone=${maskPhone(phone)} code=${code}`);
  }
}

/** Dev/test: no-op send (code is fixed via SMS_FIXED_CODE). */
export class FixedSmsProvider implements SmsProvider {
  async sendLoginCode(phone: string, _code: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[SMS:fixed] phone=${maskPhone(phone)} (using SMS_FIXED_CODE)`);
  }
}

export function maskPhone(phone: string): string {
  if (phone.length < 7) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function createSmsProvider(): SmsProvider {
  const kind = (process.env.SMS_PROVIDER || 'console').toLowerCase();
  if (kind === 'fixed') return new FixedSmsProvider();
  return new ConsoleSmsProvider();
}
