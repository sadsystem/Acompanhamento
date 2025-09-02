// Serverless entrypoint para Vercel.
// Constrói o app Express uma única vez (lazy) sem chamar .listen().
import express from 'express';
import cors from 'cors';
import { registerRoutes } from '../server/routes';

let appPromise: Promise<express.Express> | null = null;

async function buildApp(): Promise<express.Express> {
  const app = express();

  app.use(cors({
    origin: '*', // pode restringir depois
    credentials: true,
  }));

  // Cache bust para rotas API
  app.use('/api', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    });
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Log simples (não truncado aqui para debug)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api')) {
        console.log(`[api] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
      }
    });
    next();
  });

  await registerRoutes(app); // ignora o httpServer retornado

  // Marca para debug saber que veio do handler serverless
  app.get('/api/_lambda/ping', (req, res) => {
    res.json({ ok: true, lambda: true, ts: new Date().toISOString() });
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
