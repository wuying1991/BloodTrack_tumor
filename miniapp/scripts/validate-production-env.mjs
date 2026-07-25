import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function parseEnvFile(contents) {
  const values = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');
    values[key] = value;
  }
  return values;
}

export function loadProductionEnv(cwd = process.cwd()) {
  const envPath = path.join(cwd, '.env.production');
  const fromFile = fs.existsSync(envPath)
    ? parseEnvFile(fs.readFileSync(envPath, 'utf8'))
    : {};
  return { ...fromFile, ...process.env };
}

export function validateProductionEnv(env) {
  const apiBase = env.VITE_API_BASE_URL;
  if (!apiBase) {
    throw new Error('[FATAL] 生产构建必须设置 VITE_API_BASE_URL');
  }

  let parsed;
  try {
    parsed = new URL(apiBase);
  } catch {
    throw new Error('[FATAL] VITE_API_BASE_URL 必须是有效的 HTTPS URL');
  }
  if (
    parsed.protocol !== 'https:' ||
    ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)
  ) {
    throw new Error('[FATAL] VITE_API_BASE_URL 必须使用公网 HTTPS 地址');
  }

  const appId = env.VITE_WEIXIN_APP_ID;
  if (!/^wx[a-zA-Z0-9]{16}$/.test(appId || '')) {
    throw new Error('[FATAL] VITE_WEIXIN_APP_ID 必须是有效的微信小程序 AppID');
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  validateProductionEnv(loadProductionEnv());
  console.log('生产配置校验通过');
}
