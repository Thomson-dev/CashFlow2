import express, { Request, Response } from 'express';
import dotenv from "dotenv";
import { connectDB } from "./config/db";

import cors from 'cors';
import authRoutes from './routes/authRoutes';
import transactionRoutes from './routes/transactionRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import chatbotRoutes from './routes/chatbotRoutes';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed in middleware:', error);
    res.status(503).json({ 
      error: 'Database service unavailable. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes - These will only execute after database is connected
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Test Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Safe Mama API is running!',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ 
    message: 'Hello from API endpoint!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Database status endpoint
app.get('/api/db-status', async (req: Request, res: Response) => {
  try {
    await connectDB();
    
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    res.json({
      success: true,
      database: {
        state: states[dbState],
        name: mongoose.connection.name || 'unknown',
        host: mongoose.connection.host || 'unknown'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8001;
  
  const startServer = async () => {
    try {
      await connectDB();
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };
  
  startServer();
}

// Export for Vercel
export default app;