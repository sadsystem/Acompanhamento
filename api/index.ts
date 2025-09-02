// Serverless entrypoint para Vercel
import express from 'express';
import cors from 'cors';
import { registerRoutes } from '../server/routes';

let appPromise: Promise<express.Express> | null = null;

async function buildApp(): Promise<express.Express> {
  const app = express();

  // CORS configuration for production
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://ponto2.ecoexpedicao.site', 'https://*.vercel.app']
      : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }));

  // Handle OPTIONS preflight requests
  app.options('*', cors());

  // Disable caching for API routes
  app.use('/api', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

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

  await registerRoutes(app);

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
    return app(req, res);
  } catch (e: any) {
    console.error('Lambda fatal error:', e);
    res.status(500).json({ error: 'lambda_init_failed', message: e.message });
  }
}
