import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes';
import bloodTestRoutes from './routes/bloodTestRoutes';
import chemoCycleRoutes from './routes/chemoCycleRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import { errorHandler, notFoundHandler } from './middlewares/errorMiddleware';

const app: Application = express();

// Security middleware
app.use(helmet());

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '请求过于频繁，请稍后重试 (Too many requests, please try again later)' },
});
app.use('/api/', limiter);

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

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(errorHandler);

export default app;
