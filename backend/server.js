require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { menuItems, categories } = require('./data/menu');

const app = express();
const PORT = 3002;

// Log startup
const fs = require('fs');
const path = require('path');
const logFile = process.env.VERCEL
  ? path.join('/tmp', 'debug_memory.log')
  : path.join(__dirname, 'debug_memory.log');
try { fs.appendFileSync(logFile, `${new Date().toISOString()} - SERVER STARTING...\n`); } catch (e) { }

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3002',
    'https://cardapio-frontend.vercel.app', // Explicit Main Domain
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
const couponRoutes = require('./routes/couponRoutes');
const pushRoutes = require('./routes/pushRoutes');
const marketingRoutes = require('./routes/marketingRoutes'); // New Route

// Initialize Services
// 1. AI Service
const AIService = require('./services/aiService');
const aiService = new AIService();

// 2. Marketing Service
const MarketingService = require('./services/marketingService');
// Retrieve credentials from env or hardcoded fallback (ideally env)
const supabaseUrl = process.env.SUPABASE_URL || 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const marketingService = new MarketingService(supabaseUrl, supabaseKey, aiService);

// Start Scheduler (Every 60 seconds)
setInterval(() => {
  marketingService.processScheduledCampaigns();
}, 60000);

// Inject service into routes via req (middleware pattern) or pass to route factory
// For simplicity in this project's style, we might pass it or let routes instantiate their own if stateless, 
// but MarketingService has state (isProcessing). 
// Let's attach to app.locals or use a getter in routes.
app.locals.marketingService = marketingService;

app.use('/api/ai', aiRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/marketing', marketingRoutes);

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
