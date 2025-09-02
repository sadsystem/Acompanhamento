// Serverless entrypoint para Vercel
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { registerRoutes } from '../server/routes';

let appPromise: Promise<express.Express> | null = null;

async function buildApp(): Promise<express.Express> {
  const app = express();

  // Enhanced CORS configuration for Vercel
  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'https://ponto2.ecoexpedicao.site',
        'http://localhost:5173',
        'http://localhost:4173',
      ];

      const allowedPatterns = [
        /^https:\/\/.*\.vercel\.app$/,
        /^https:\/\/acompanhamento-.*\.vercel\.app$/,
      ];

      const isAllowed = allowedOrigins.includes(origin) ||
                       allowedPatterns.some(pattern => pattern.test(origin));

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }));

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request timeout for serverless
  app.use((req, res, next) => {
    res.setTimeout(25000, () => {
      res.status(408).json({ message: 'Request timeout' });
    });
    next();
  });

  // Disable caching for API routes
  app.use('/api', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    next();
  });

  // Remove duplicate middleware (already set above)
  // app.use(express.json({ limit: '1mb' }));
  // app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // Minimal logging for serverless (avoid excessive logs)
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        if (req.path.startsWith('/api')) {
          console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
        }
      });
      next();
    });
  }

  // Register API routes
  await registerRoutes(app);

  // Global error handler
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  });

  // Serverless health check
  app.get('/api/_vercel/health', (req, res) => {
    res.json({ 
      ok: true, 
      serverless: true, 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });

  return app;
}

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) appPromise = buildApp();
    const app = await appPromise;
    
    // Handle the request through the Express app
    return new Promise((resolve, reject) => {
      app(req, res, (err: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  } catch (e: any) {
    console.error('Serverless handler error:', e);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'serverless_handler_error', 
        message: e.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}
