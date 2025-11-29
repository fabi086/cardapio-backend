const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Webhook for Evolution API
router.post('/webhook', async (req, res) => {
    try {
        const { data, sender } = req.body;
        console.log('Webhook received:', JSON.stringify(req.body, null, 2));



        // Basic validation of Evolution API payload
        if (data && data.key && !data.key.fromMe) {
            await aiService.processMessage({
                remoteJid: data.key.remoteJid,
                pushName: data.pushName,
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

module.exports = router;
