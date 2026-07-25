import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  loadProductionEnv,
  validateProductionEnv,
} from './validate-production-env.mjs';

export function finalizeProjectConfig(config, appId) {
  return {
    ...config,
    appid: appId,
    setting: {
      ...(config.setting || {}),
      urlCheck: true,
    },
  };
}

export function finalizeWeixinBuild(cwd = process.cwd()) {
  const env = loadProductionEnv(cwd);
  validateProductionEnv(env);
  const configPath = path.join(
    cwd,
    'dist',
    'build',
    'mp-weixin',
    'project.config.json'
  );
  if (!fs.existsSync(configPath)) {
    throw new Error('[FATAL] 未找到微信小程序构建产物 project.config.json');
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const finalized = finalizeProjectConfig(config, env.VITE_WEIXIN_APP_ID);
  fs.writeFileSync(configPath, `${JSON.stringify(finalized, null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  finalizeWeixinBuild();
  console.log('微信小程序生产配置已写入构建产物');
}
