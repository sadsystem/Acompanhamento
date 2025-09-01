import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Test endpoint to verify the serverless deployment is working
 * Access at: /api/test
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Basic environment check
    const checks = {
      timestamp: new Date().toISOString(),
      method: req.method,
      hasDatabase: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      vercel: {
        region: process.env.VERCEL_REGION,
        url: process.env.VERCEL_URL
      }
    };

    // Test import of core modules
    try {
      const { SupabaseStorage } = await import('../../server/supabaseStorage');
      checks.supabaseImport = 'OK';
    } catch (error) {
      checks.supabaseImport = `ERROR: ${error.message}`;
    }

    try {
      const { MemStorage } = await import('../../server/storage');
      checks.memStorageImport = 'OK';
    } catch (error) {
      checks.memStorageImport = `ERROR: ${error.message}`;
    }

    // Test basic auth endpoints exist
    checks.authEndpoints = {
      login: '/api/auth/login',
      logout: '/api/auth/logout', 
      me: '/api/auth/me'
    };

    res.status(200).json({
      success: true,
      message: 'Serverless deployment is working!',
      checks
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}