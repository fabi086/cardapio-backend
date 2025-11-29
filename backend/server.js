require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { menuItems, categories } = require('./data/menu');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);

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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
