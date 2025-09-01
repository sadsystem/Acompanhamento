import type { NextApiRequest, NextApiResponse } from 'next';
import { SupabaseStorage } from "../../../../server/supabaseStorage";

type MeSuccessResponse = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  cargo: string;
};

type MeErrorResponse = {
  error: string;
};

type MeResponse = MeSuccessResponse | MeErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MeResponse>
) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: "Método não permitido"
    });
  }

  try {
    // Validate environment variables
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is missing");
      return res.status(500).json({
        error: "Erro de configuração do servidor"
      });
    }

    // Get token from Authorization header
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ 
        error: "Token não fornecido" 
      });
    }
    
    // Initialize storage
    let storage: SupabaseStorage;
    try {
      storage = new SupabaseStorage();
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return res.status(500).json({
        error: "Erro ao conectar com o banco de dados"
      });
    }
    
    // Mock token validation - extract user ID
    const userId = token.replace("token-", "");
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ 
        error: "Token inválido" 
      });
    }
    
    res.status(200).json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      cargo: user.cargo || '',
    });
  } catch (error) {
    console.error("Me endpoint error:", error);
    return res.status(500).json({ 
      error: "Erro interno do servidor" 
    });
  }
}