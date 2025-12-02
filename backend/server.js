require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { menuItems, categories } = require('./data/menu');

const app = express();
const PORT = 3002;

// Log startup
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'debug_memory.log');
try { fs.appendFileSync(logFile, `${new Date().toISOString()} - SERVER STARTING...\n`); } catch (e) { }

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3002',
    'https://cardapio-frontend-u6qq.vercel.app', // Frontend Vercel
    'https://cardapio-backend-jzit.vercel.app', // Backend Vercel (para chat widget)
    /\.vercel\.app$/ // Fallback para qualquer subdomínio vercel
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);

const couponRoutes = require('./routes/couponRoutes');
app.use('/api/coupons', couponRoutes);

// Root route to verify server is running
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Get all categories
app.get('/api/categories', (req, res) => {
  res.json(categories);
});

// Get menu items (optional filter by category)
app.get('/api/menu', (req, res) => {
  const { category } = req.query;

  if (category && category !== 'Todos') {
    const filteredItems = menuItems.filter(item => item.category === category);
    return res.json(filteredItems);
  }

  res.json(menuItems);
});

// Send WhatsApp notification (placeholder implementation)
app.post('/api/send-whatsapp', (req, res) => {
  const { orderId, message } = req.body;
  // TODO: Integrate with real WhatsApp API (e.g., Twilio, Meta Business API)
  console.log(`WhatsApp notification for order ${orderId}: ${message}`);
  // Simulate success response
  res.json({ success: true, info: 'WhatsApp message simulated' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
