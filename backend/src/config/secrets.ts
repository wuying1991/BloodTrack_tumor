import crypto from 'crypto';

/**
 * 启动时解析 JWT 相关 secret，并在生产环境缺失时让进程立即失败。
 *
 * 设计原因:
 *  - 之前各处 `process.env.JWT_SECRET || 'fallback_secret_key'` 写法导致
 *    一旦 .env 没加载，签名/校验都会用同一个公开字面量 —— 任何拿到代码的人
 *    都能伪造 token。
 *  - 这里把配置集中到一处：生产硬性要求 env，开发 / 测试用一次性随机串
 *    （进程级，重启即失效，可防止开发期意外把数据带到生产）。
 */

const isProduction = process.env.NODE_ENV === 'production';

function loadSecret(name: string, fallback: string | undefined): string {
  const fromEnv = process.env[name];
  if (fromEnv && fromEnv.length >= 16) return fromEnv;

  if (isProduction) {
    throw new Error(
      `[FATAL] 生产环境必须设置环境变量 ${name} (至少 16 字符)。请检查 .env 或部署配置。`
    );
  }

  // 开发 / 测试: 用 fallback 或一次性随机串
  const generated = fallback ?? crypto.randomBytes(32).toString('hex');
  // eslint-disable-next-line no-console
  console.warn(
    `[WARN] ${name} 未设置或长度不足，已生成进程级随机值 (仅限开发/测试)。`
  );
  return generated;
}

// access 与 refresh 分别加载；refresh 缺失时复用 access (与原行为一致)
const JWT_SECRET = loadSecret('JWT_SECRET', undefined);
const JWT_REFRESH_SECRET = loadSecret('JWT_REFRESH_SECRET', JWT_SECRET);

export const secrets = {
  jwt: JWT_SECRET,
  jwtRefresh: JWT_REFRESH_SECRET,
} as const;
