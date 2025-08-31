// Vercel serverless function - JavaScript version
const express = require('express');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://*.vercel.app', 'https://*.lendagames.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Basic test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API working!' });
});

// Import and register routes (will need to be converted)
try {
  const { registerRoutes } = require('../server/routes');
  registerRoutes(app);
} catch (error) {
  console.log('Routes not available yet:', error.message);
}

module.exports = app;