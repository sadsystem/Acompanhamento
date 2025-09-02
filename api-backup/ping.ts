export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    source: 'standalone-function',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
}
