const express = require('express');
const router = express.Router();

// Helper to get service
const getService = (req) => req.app.locals.marketingService;

// --- CLIENTES (Proxy para evitar RLS/Permissões no front) ---
router.get('/customers', async (req, res) => {
    try {
        const { limit, search } = req.query;
        const customers = await getService(req).getCustomers(limit, search);
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GRUPOS ---

router.get('/groups', async (req, res) => {
    try {
        const groups = await getService(req).getGroups();
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/groups', async (req, res) => {
    try {
        const { name, description } = req.body;
        const group = await getService(req).createGroup(name, description);
        res.json(group);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/groups/:groupId/members', async (req, res) => {
    try {
        const members = await getService(req).getGroupMembers(req.params.groupId);
        res.json(members);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/groups/:groupId/members', async (req, res) => {
    try {
        const { customerId } = req.body;
        await getService(req).addCustomerToGroup(req.params.groupId, customerId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/groups/:groupId/members/:customerId', async (req, res) => {
    try {
        await getService(req).removeCustomerFromGroup(req.params.groupId, req.params.customerId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CAMPANHAS ---

router.get('/campaigns', async (req, res) => {
    try {
        const campaigns = await getService(req).getCampaigns();
        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/campaigns/:id', async (req, res) => {
    try {
        const campaign = await getService(req).getCampaignDetails(req.params.id);
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/campaigns', async (req, res) => {
    try {
        const { title, messageTemplate, messageVariations, imageUrl, targetGroupId, scheduledAt } = req.body;

        // Simple validation
        if (!title || !targetGroupId || (!messageTemplate && (!messageVariations || messageVariations.length === 0))) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
        }

        const campaign = await getService(req).createCampaign({
            title,
            messageTemplate,
            messageVariations,
            imageUrl,
            targetGroupId,
            scheduledAt
        });
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// AI Variations Generator Endpoint
router.post('/generate-variations', async (req, res) => {
    try {
        // We use the AI Service to generate variations
        const { baseMessage } = req.body;

        if (!baseMessage) return res.status(400).json({ error: 'Mensagem base necessária' });

        const service = getService(req);
        // We access openai directly from aiService or add a helper there.
        // Assuming aiService.openai is public or we can use a helper suitable for text generation.
        // Let's implement a quick helper call here via the raw openai instance if available, 
        // OR add a method to MarketingService.

        if (!service.aiService.openai) {
            await service.aiService.loadSettings(); // Ensure loaded
        }

        if (!service.aiService.openai) {
            return res.status(500).json({ error: 'OpenAI não configurado.' });
        }

        const prompt = `
        Crie 3 variações da seguinte mensagem de marketing para WhatsApp. 
        Mantenha o tom amigável e persuasivo. As variações devem ser ligeiramente diferentes para evitar filtros de spam.
        Mensagem original: "${baseMessage}"
        
        Retorne APENAS um array JSON de strings, exemplo: ["msg1", "msg2", "msg3"]. Nada mais.
        `;

        const completion = await service.aiService.openai.chat.completions.create({
            model: "gpt-4o-mini", // fast and cheap
            messages: [{ role: "user", content: prompt }]
        });

        const content = completion.choices[0].message.content;

        // Parse JSON
        let variations = [];
        try {
            // Remove markdown code blocks if any
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            variations = JSON.parse(cleanContent);
        } catch (e) {
            // Fallback: split by newlines if parsing fails
            variations = content.split('\n').filter(l => l.length > 10);
        }

        res.json({ variations });

    } catch (err) {
        console.error('Error generating variations:', err);
        res.status(500).json({ error: 'Erro ao gerar variações com IA.' });
    }
});


module.exports = router;
