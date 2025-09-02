export default function handler(request, response) {
  response.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Simple test handler working'
  });
}
