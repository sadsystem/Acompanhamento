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
    // Initialize database connection
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Supabase connection");
    }
    
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    const db = drizzle(client);
    
    const allUsers = await db.select().from(users);
    const teamMembers = allUsers
      .filter(u => u.role === "colaborador" && u.active)
      .map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        cargo: u.cargo,
      }));
    
    return res.status(200).json(teamMembers);
    
  } catch (error) {
    console.error("Team users error:", error);
    return res.status(500).json({ error: "Erro ao buscar equipe" });
  }
}