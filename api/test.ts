// Simple test handler
export default function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Log the request
  console.log(`${req.method} ${req.url}`);
  
  // Simple response
  return res.json({
    status: 'ok',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
}
