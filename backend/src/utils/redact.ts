/**
 * Log / error sanitization — never echo secrets or huge payloads.
 */

const SECRET_KEY_RE =
  /(api[_-]?key|secret|password|token|authorization|private[_-]?key|secret[_-]?id|secret[_-]?key)/i;

/** Max characters of any single string to keep in logs */
const MAX_STRING = 200;

export function redactString(input: string): string {
  if (!input) return input;
  let s = input;
  // Bearer tokens
  s = s.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
  // Common key=value patterns
  s = s.replace(
    /(api[_-]?key|secret|password|token|authorization)\s*[:=]\s*["']?([^\s"',}]+)/gi,
    '$1=[REDACTED]'
  );
  // Long base64-ish blobs (likely images / keys)
  s = s.replace(/[A-Za-z0-9+/]{80,}={0,2}/g, '[BASE64_REDACTED]');
  if (s.length > MAX_STRING) {
    s = `${s.slice(0, MAX_STRING)}…[truncated ${s.length} chars]`;
  }
  return s;
}

export function redactErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : String(err);
  return redactString(raw);
}

export function safeLogMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SECRET_KEY_RE.test(k)) {
      out[k] = v ? '[REDACTED]' : v;
      continue;
    }
    if (k === 'imageBase64' || k === 'ImageBase64' || k === 'password') {
      out[k] = v ? `[omitted len=${String(v).length}]` : v;
      continue;
    }
    if (typeof v === 'string') {
      out[k] = redactString(v);
    } else if (typeof v === 'number' || typeof v === 'boolean' || v == null) {
      out[k] = v;
    } else {
      out[k] = '[object]';
    }
  }
  return out;
}

/** Reject oversized base64 payloads before parsing (≈ raw bytes * 4/3) */
export const MAX_LAB_IMAGE_BASE64_CHARS = 6 * 1024 * 1024; // ~4.5MB binary
