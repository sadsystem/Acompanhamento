import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SupabaseStorage } from "../../server/supabaseStorage";
import { MemStorage } from "../../server/storage";

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
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: "Método não permitido"
    });
  }

  try {
    // Initialize storage - use MemStorage as fallback for testing
    let storage: SupabaseStorage | MemStorage;
    try {
      if (process.env.DATABASE_URL) {
        storage = new SupabaseStorage();
      } else {
        console.log("DATABASE_URL not available, using MemStorage for testing");
        storage = new MemStorage();
      }
    } catch (dbError) {
      console.error("Database connection error, falling back to MemStorage:", dbError);
      storage = new MemStorage();
    }
    
    // Get token from Authorization header
    const token = req.headers.authorization?.replace("Bearer ", "") as string;
    
    if (!token) {
      return res.status(401).json({ 
        error: "Token não fornecido" 
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