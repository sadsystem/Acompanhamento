import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from "zod";
import { SupabaseStorage } from "../../../../server/supabaseStorage";

// Login request validation schema
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

// Response types
type LoginSuccessResponse = {
  success: true;
  data: {
    token: string;
    user: {
      id: string;
      username: string;
      displayName: string;
      role: string;
      cargo: string;
    };
  };
};

type LoginErrorResponse = {
  success: false;
  error: string;
};

type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: "Método não permitido"
    });
  }

  try {
    // Validate environment variables
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is missing");
      return res.status(500).json({
        success: false,
        error: "Erro de configuração do servidor"
      });
    }

    // Initialize storage
    let storage: SupabaseStorage;
    try {
      storage = new SupabaseStorage();
      // Seed initial data if needed
      await storage.seedInitialData();
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return res.status(500).json({
        success: false,
        error: "Erro ao conectar com o banco de dados"
      });
    }

    // Parse and validate request body
    const { username, password, remember } = loginSchema.parse(req.body);
    
    console.log("DEBUG: Login attempt for username:", username);
    
    // Get user from database
    const user = await storage.getUserByUsername(username);
    
    if (!user || user.password !== password) {
      console.log("DEBUG: Authentication failed for username:", username);
      return res.status(401).json({ 
        success: false, 
        error: "Credenciais inválidas" 
      });
    }

    // Check if user is active
    if (!user.active) {
      console.log("DEBUG: User is inactive:", username);
      return res.status(401).json({ 
        success: false, 
        error: "Usuário inativo" 
      });
    }
    
    // Generate token (in production, use proper JWT)
    const token = `token-${user.id}`;
    
    console.log("DEBUG: Login successful for user:", user.username);
    
    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          cargo: user.cargo || '',
        }
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: "Dados inválidos" 
      });
    }
    
    // Handle other errors
    return res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
}