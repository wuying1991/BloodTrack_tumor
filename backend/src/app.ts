import express, { Application, Request, Response } from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes';
import bloodTestRoutes from './routes/bloodTestRoutes';
import { errorHandler, notFoundHandler } from './middlewares/errorMiddleware';

const app: Application = express();

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

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(errorHandler);

export default app;
