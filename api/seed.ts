import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { users, questions, insertUserSchema, insertQuestionSchema } from "../../shared/schema";

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
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Initialize database connection
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Supabase connection");
    }
    
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    const db = drizzle(client);
    
    // Check if admin user exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, "8799461725")).limit(1);
    
    if (existingAdmin.length === 0) {
      console.log("Seeding admin user...");
      
      // Create admin user
      await db.insert(users).values({
        id: "admin-001",
        username: "8799461725",
        password: "admin",
        displayName: "Administrator",
        role: "admin" as const,
        permission: "Admin" as const,
        active: true,
        cargo: "Administrador"
      });
    }
    
    // Check if questions exist
    const existingQuestions = await db.select().from(questions).limit(1);
    
    if (existingQuestions.length === 0) {
      console.log("Seeding questions...");
      
      const defaultQuestions = [
        {
          id: "q1",
          text: "Chegou no horário?",
          category: "pontualidade"
        },
        {
          id: "q2", 
          text: "Está usando uniforme completo?",
          category: "apresentacao"
        },
        {
          id: "q3",
          text: "Veículo está limpo e organizado?",
          category: "veiculo"
        }
      ];
      
      for (const question of defaultQuestions) {
        await db.insert(questions).values(question);
      }
    }
    
    // Seed some test users if they don't exist
    const testUsernames = ["8799461001", "8799461002"];
    
    for (const username of testUsernames) {
      const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
      
      if (existingUser.length === 0) {
        const testUser = {
          id: `user-${username}`,
          username: username,
          password: "123456",
          displayName: username.includes("001") ? "Motorista Teste" : "Ajudante Teste",
          role: "colaborador" as const,
          permission: "Colaborador" as const,
          active: true,
          cargo: username.includes("001") ? "Motorista" : "Ajudante"
        };
        await db.insert(users).values(testUser);
      }
    }
    
    return res.status(200).json({ success: true, message: "Database seeded successfully" });
    
  } catch (error) {
    console.error("Seed error:", error);
    return res.status(500).json({ error: "Erro ao inicializar dados" });
  }
}