const express = require('express');
const router = express.Router();
const pushService = require('../services/pushService');

// Get Public Key
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: pushService.getPublicKey() });
});

// Subscribe
router.post('/subscribe', async (req, res) => {
    try {
        const subscription = req.body;
        const userAgent = req.headers['user-agent'];
        await pushService.saveSubscription(subscription, userAgent);
        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Test Send (Optional)
router.post('/send-test', async (req, res) => {
    try {
        const { message } = req.body;
        await pushService.sendNotificationToAll({
            title: 'Teste de Notificação',
            body: message || 'Se você recebeu isso, o Push funciona!',
            icon: '/logo.svg'
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Send error:', error);
        res.status(500).json({ error: 'Failed to send' });
    }
});

module.exports = router;
