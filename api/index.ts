// Main API handler for Vercel
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { registerRoutes } from '../server/routes';

// Create Express app
const app = express();

// CORS configuration  
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize routes once
let routesInitialized = false;

async function initRoutes() {
  if (!routesInitialized) {
    await registerRoutes(app);
    routesInitialized = true;
    console.log('Routes initialized');
  }
}

// Export handler
export default async function handler(req: any, res: any) {
  try {
    console.log(`Incoming: ${req.method} ${req.url}`);
    
    // Initialize routes if needed
    await initRoutes();
    
    // Handle the request
    app(req, res);
  } catch (error) {
    console.error('API Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
