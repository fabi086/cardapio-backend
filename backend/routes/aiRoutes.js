const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const pushService = require('../services/pushService');
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

// Generic Send Message Endpoint (Campaigns)
router.post('/send-message', async (req, res) => {
    try {
        const { phone, message, mediaUrl } = req.body;

        if (!phone || !message) {
            aiService.logToDb('warning', 'Send Message Validation Failed', { phone, messageProvided: !!message });
            return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
        }

        const remoteJid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
        const result = await aiService.sendMessage(remoteJid, message, 'whatsapp', mediaUrl);

        // Verificar se retornou resultado de serviço inativo
        if (result && result.success === false) {
            return res.status(400).json({ error: result.error || 'Falha ao enviar mensagem' });
        }

        res.json({ success: true, data: result?.data });
    } catch (error) {
        console.error('Error sending generic message:', error);
        aiService.logToDb('error', 'Send Message Endpoint Failed', {
            error: error.message,
            phone: req.body?.phone
        });
        res.status(500).json({
            error: 'Falha ao enviar mensagem',
            details: error.message,
            response: error.response?.data
        });
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
        // Format items for display
        let itemsList = '';
        if (order.items && order.items.length > 0) {
            itemsList = '\n\n🛒 *Itens:*\n' + order.items.map(i => `- ${i.quantity}x ${i.product_name || i.name}`).join('\n');
        }

        const message = `🔥 *NOVO PEDIDO #${order.order_number} CHEGOU!* 🔥\n\n👤 *Cliente:* ${order.customer_name}\n💰 *Total:* R$ ${parseFloat(order.total).toFixed(2)}\n🛵 *Tipo:* ${order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada'}${itemsList}\n\nAcesse o painel para ver detalhes!`;

        const remoteJid = `${adminPhone}@s.whatsapp.net`;

        // Send using AI Service underlying sender
        await aiService.sendMessage(remoteJid, message);

        // Also Send Web Push Notification (Service Worker)
        let pushBody = `R$ ${parseFloat(order.total).toFixed(2)} - ${order.customer_name}`;
        if (order.items && order.items.length > 0) {
            const itemsSummary = order.items.map(i => `${i.quantity}x ${i.product_name || i.name}`).join(', ');
            pushBody += `\n${itemsSummary}`;
        }

        await pushService.sendNotificationToAll({
            title: `Novo Pedido #${order.order_number}!`,
            body: pushBody,
            icon: 'https://cardapio-frontend-u6qq.vercel.app/logo.svg', // Ensure absolute URL for notifications
            url: '/admin/orders'
        });

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

// Generate Campaign Message with AI
router.post('/generate-message', async (req, res) => {
    try {
        const { prompt, businessType } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt é obrigatório' });
        }

        // Fetch settings to get OpenAI key
        const { data: settings } = await supabase
            .from('ai_integration_settings')
            .select('openai_api_key')
            .single();

        if (!settings?.openai_api_key) {
            return res.status(400).json({ error: 'API Key da OpenAI não configurada' });
        }

        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: settings.openai_api_key });

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Você é um especialista em marketing digital para WhatsApp. Gere mensagens promocionais criativas, persuasivas e adequadas para campanhas de WhatsApp. 
As mensagens devem:
- Ser curtas e diretas (máximo 300 caracteres)
- Usar emojis de forma moderada
- Incluir call-to-action
- Usar {name} como placeholder para o nome do cliente
- Ser em português brasileiro
- Ser amigáveis e não parecer spam`
                },
                {
                    role: 'user',
                    content: `Gere 3 variações de mensagem promocional para: ${prompt}${businessType ? `. Tipo de negócio: ${businessType}` : ''}`
                }
            ],
            max_tokens: 500,
            temperature: 0.8
        });

        const content = completion.choices[0].message.content;

        // Parse the response into separate messages
        const messages = content.split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
            .filter(msg => msg.length > 10);

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error generating message:', error);
        res.status(500).json({ error: 'Erro ao gerar mensagem', details: error.message });
    }
});

// Generate Campaign Image with AI (DALL-E)
router.post('/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt é obrigatório' });
        }

        // Fetch settings to get OpenAI key
        const { data: settings } = await supabase
            .from('ai_integration_settings')
            .select('openai_api_key')
            .single();

        if (!settings?.openai_api_key) {
            return res.status(400).json({ error: 'API Key da OpenAI não configurada' });
        }

        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: settings.openai_api_key });

        const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: `Create a professional marketing image for WhatsApp campaign: ${prompt}. Make it visually appealing, modern, and suitable for mobile viewing. No text in the image.`,
            n: 1,
            size: '1024x1024',
            quality: 'standard'
        });

        const imageUrl = response.data[0].url;

        // Download and upload to Supabase for permanent storage
        const axios = require('axios');
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(imageResponse.data);

        const fileName = `campaigns/ai_${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('menu-items')
            .upload(fileName, buffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            // Return OpenAI URL as fallback (expires in 1 hour)
            return res.json({ success: true, imageUrl, temporary: true });
        }

        const { data: { publicUrl } } = supabase.storage
            .from('menu-items')
            .getPublicUrl(fileName);

        res.json({ success: true, imageUrl: publicUrl });
    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).json({ error: 'Erro ao gerar imagem', details: error.message });
    }
});

module.exports = router;

