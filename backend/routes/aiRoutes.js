const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
// Initialize Supabase client
const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

// Webhook for Evolution API
router.post('/webhook', async (req, res) => {
    try {
        const { data, sender } = req.body;
        console.log('Webhook received:', JSON.stringify(req.body, null, 2));

        // Log to DB
        aiService.logToDb('info', 'Webhook Received', {
            remoteJid: data?.key?.remoteJid,
            pushName: data?.pushName,
            messageType: data?.messageType,
            hasBody: !!req.body
        });

        // Basic validation of Evolution API payload
        if (data && data.key && !data.key.fromMe) {
            let remoteJid = data.key.remoteJid;

            // Fix for LID (Linked Device ID) issues: use sender JID if available
            if (sender) {
                if (typeof sender === 'string' && sender.includes('@s.whatsapp.net')) {
                    remoteJid = sender;
                } else if (typeof sender === 'object' && sender.jid && sender.jid.includes('@s.whatsapp.net')) {
                    remoteJid = sender.jid;
                }
            }

            await aiService.processMessage({
                remoteJid: remoteJid,
                pushName: data.pushName || (typeof sender === 'object' ? sender.name : null),
                conversation: data.message?.conversation || data.message?.extendedTextMessage?.text,
                audioMessage: data.message?.audioMessage,
                base64: data.base64 || data.message?.audioMessage?.base64, // Try to find base64
                messageType: data.messageType
            });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get AI Settings
router.get('/config', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ai_integration_settings')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Row not found"

        res.json(data || {});
    } catch (error) {
        console.error('Error fetching AI config:', error);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

// Save AI Settings
router.post('/config', async (req, res) => {
    try {
        const settings = req.body;
        console.log('Received settings to save:', settings);

        // Check if exists
        const { data: existing, error: fetchError } = await supabase
            .from('ai_integration_settings')
            .select('id')
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking existing settings:', fetchError);
            throw fetchError;
        }

        let result;
        if (existing) {
            console.log('Updating existing settings:', existing.id);
            result = await supabase
                .from('ai_integration_settings')
                .update({ ...settings, updated_at: new Date() })
                .eq('id', existing.id);
        } else {
            console.log('Inserting new settings');
            // Remove id if present to allow auto-generation, or keep it if intentional
            const { id, ...settingsToInsert } = settings;
            result = await supabase
                .from('ai_integration_settings')
                .insert([settingsToInsert]);
        }

        if (result.error) {
            console.error('Supabase write error:', result.error);
            throw result.error;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving AI config:', error);
        res.status(500).json({ error: 'Failed to save config', details: error.message });
    }
});

// Send Status Notification
router.post('/notify-status', async (req, res) => {
    try {
        const { phone, status, orderId } = req.body;

        if (!phone || !status || !orderId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await aiService.sendNotification(phone, status, orderId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// Notify Admin of New Order (WhatsApp)
router.post('/notify-admin', async (req, res) => {
    try {
        const { order } = req.body;

        // Fetch Admin/Business Phone
        const { data: settings } = await supabase
            .from('business_settings')
            .select('whatsapp')
            .single();

        if (!settings || !settings.whatsapp) {
            console.log('No WhatsApp number configured for admin notification');
            return res.json({ success: false, message: 'No admin phone configured' });
        }

        const adminPhone = settings.whatsapp.replace(/\D/g, '');
        const message = `🔥 *NOVO PEDIDO #${order.order_number} CHEGOU!* 🔥\n\n👤 *Cliente:* ${order.customer_name}\n💰 *Total:* R$ ${parseFloat(order.total).toFixed(2)}\n🛵 *Tipo:* ${order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada'}\n\nAcesse o painel para ver detalhes!`;

        const remoteJid = `${adminPhone}@s.whatsapp.net`;

        // Send using AI Service underlying sender
        await aiService.sendMessage(remoteJid, message);

        res.json({ success: true });
    } catch (error) {
        console.error('Error notifying admin:', error);
        // Don't fail the request if notification fails
        res.json({ success: false, error: error.message });
    }
});

// Web Chat Endpoint
router.post('/chat', async (req, res) => {
    try {
        console.log('Chat endpoint called');
        const { message, audio, userPhone } = req.body;

        // Simulate a WhatsApp-like message structure for the service
        const messageData = {
            remoteJid: `${userPhone}@s.whatsapp.net`,
            pushName: 'Web User',
            conversation: message,
            text: { message: message },
            base64: audio // Pass audio base64 if present
        };

        const responses = await aiService.processMessage(messageData, 'web');
        res.json({ success: true, responses });
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Poll Endpoint
router.get('/poll', async (req, res) => {
    try {
        const { userPhone } = req.query;
        if (!userPhone) return res.status(400).json({ error: 'userPhone required' });

        const history = await aiService.getHistory(userPhone);
        res.json({ success: true, messages: history });
    } catch (error) {
        console.error('Error in poll endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
