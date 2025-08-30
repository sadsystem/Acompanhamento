// Vercel serverless function wrapper
import { registerRoutes } from '../server/routes';
import express from 'express';
import cors from 'cors';

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://ponto2.ecoexpedicao.site', 'https://*.vercel.app']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Register all routes
registerRoutes(app);

export default app;