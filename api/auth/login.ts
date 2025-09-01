import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { users } from "../../shared/schema";
import { z } from "zod";

// Authentication schema
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    console.log("DEBUG: Serverless login endpoint hit");
    
    // Initialize database connection
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Supabase connection");
    }
    
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    const db = drizzle(client);
    
    // Parse and validate request body
    const { username, password, remember } = loginSchema.parse(req.body);
    
    // Get user by username
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = result[0];
    
    if (!user || user.password !== password) {
      return res.status(401).json({ 
        success: false, 
        error: "Credenciais inválidas" 
      });
    }
    
    // Generate token (in production, use proper JWT)
    const token = `token-${user.id}`;
    
    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          cargo: user.cargo,
        }
      }
    });
    
  } catch (error) {
    console.error("Login error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: "Dados inválidos" 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
}