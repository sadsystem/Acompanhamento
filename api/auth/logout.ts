import type { VercelRequest, VercelResponse } from '@vercel/node';

type LogoutResponse = {
  success: boolean;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false
    });
  }

  try {
    // In a real app, invalidate JWT token here
    // For now, just return success
    console.log("DEBUG: Logout endpoint hit");
    
    res.status(200).json({ 
      success: true 
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ 
      success: false 
    });
  }
}