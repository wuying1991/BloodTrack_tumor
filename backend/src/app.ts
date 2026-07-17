import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import authRoutes from './routes/authRoutes';
import bloodTestRoutes from './routes/bloodTestRoutes';
import chemoCycleRoutes from './routes/chemoCycleRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import reminderRoutes from './routes/reminderRoutes';
import shareRoutes from './routes/shareRoutes';
import publicShareRoutes from './routes/publicShareRoutes';
import { errorHandler, notFoundHandler } from './middlewares/errorMiddleware';

const app: Application = express();

// 生产环境运行在反向代理(nginx)后：信任 1 跳，使 req.ip 取真实客户端 IP
// （全局/登录限流按 IP 计数、审计日志新 IP 检测都依赖此）。dev/test 直连后端不信任。
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

// Security middleware
app.use(helmet());

// 测试环境跳过限流：避免集成测试 30 个用例打爆 5/min 阈值
const isTest = process.env.NODE_ENV === 'test';
// E2E (Playwright) 跑全链路 + 重试，单 IP 短时间大量请求，显式开关关闭限流
const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === 'true';
const skipRateLimit = () => isTest || rateLimitDisabled;

// 全局限流: 每 IP 每 15 分钟 100 次（开发环境放宽到 2000，避免本地联调撞限流）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 100 : (process.env.NODE_ENV === 'development' ? 2000 : 100),
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  message: { success: false, code: 'RATE_LIMIT_GLOBAL', message: '请求过于频繁，请稍后重试 (Too many requests, please try again later)' },
});

// 敏感端点限流: 撞库/暴力破解防护，每 IP 每分钟 5 次
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功登录不计入，避免正常用户被锁
  skip: skipRateLimit,
  message: { success: false, code: 'RATE_LIMIT_AUTH', message: '尝试次数过多，请稍后再试 (Too many attempts, please try again later)' },
});

// 公开 share API 限流: 30 次/分钟/IP（meta + verify + 3 资源 = 5 个请求/次访问，余量充足）
const publicShareLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  message: { success: false, code: 'RATE_LIMIT_SHARE', message: '请求过于频繁 (Too many requests)' },
});

// PIN verify 端点单独限流: 5 次/分钟/IP+token, 跳过成功
const pinVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}:${req.params?.token ?? 'no-token'}`,
  skip: skipRateLimit,
  message: { success: false, code: 'RATE_LIMIT_PIN', message: '尝试过多，请稍后再试 (Too many attempts)' },
});

app.use('/api/', limiter);
// 必须在 /api 全局限流之后、authRoutes 挂载之前注册
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// 公开 share API 限流（必须在 publicShareRoutes 挂载之前）
app.use('/api/public/shares', publicShareLimiter);
app.use('/api/public/shares/:token/verify', pinVerifyLimiter);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    success: true, 
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/blood-tests', bloodTestRoutes);
app.use('/api/chemo-cycles', chemoCycleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/shares', shareRoutes);

// 公开路由（无 protect 中间件）
app.use('/api/public/shares', publicShareRoutes);

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(errorHandler);

export default app;
