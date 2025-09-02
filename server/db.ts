import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

// Configure for serverless environments (Vercel doesn't support WebSockets)
if (process.env.NODE_ENV === 'production') {
  neonConfig.fetchConnectionCache = true;
  neonConfig.useSecureWebSocket = false;
} else {
  // Only use WebSockets in development
  try {
    const ws = require("ws");
    neonConfig.webSocketConstructor = ws;
  } catch (error) {
    console.warn('WebSocket not available, using HTTP fallback');
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
