import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

// Connection pool cache for serverless
let app: express.Express | null = null;

async function createApp(): Promise<express.Express> {
  if (app) {
    return app;
  }

  app = express();

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

  // Disable caching for all API routes - force fresh data
  app.use('/api', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'ETag': Math.random().toString()
    });
    next();
  });

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });

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

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../client/dist');
    app.use(express.static(distPath));
    
    // Catch-all handler for SPA
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        res.status(404).json({ message: 'API endpoint not found' });
      }
    });
  }

  return app;
}

// Export for Vercel serverless
export default async function handler(req: any, res: any) {
  const expressApp = await createApp();
  return expressApp(req, res);
}

// For local development
if (process.env.NODE_ENV !== 'production') {
  createApp().then(app => {
    const PORT = process.env.PORT || 3001;
    const server = app.listen(PORT, () => {
      log(`Server running on port ${PORT}`);
    });
    
    // Setup Vite for development only
    if (process.env.NODE_ENV === 'development') {
      setupVite(app, server);
    } else {
      serveStatic(app);
    }
  }).catch(console.error);
}
