import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { users } from "../../shared/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }
    
    // Initialize database connection
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Supabase connection");
    }
    
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    const db = drizzle(client);
    
    // Mock token validation - extract user ID
    const userId = token.replace("token-", "");
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = result[0];
    
    if (!user) {
      return res.status(401).json({ error: "Token inválido" });
    }
    
    return res.status(200).json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      cargo: user.cargo,
    });
    
  } catch (error) {
    console.error("Me endpoint error:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}