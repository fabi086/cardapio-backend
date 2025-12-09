const aiService = require('./services/aiService');
const { createClient } = require('@supabase/supabase-js');

// Mock config to ensure we run standalone
const run = async () => {
    try {
        console.log('Testing Admin Notification...');

        // 1. Fetch settings manually just to be sure
        const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: settings } = await supabase
            .from('business_settings')
            .select('whatsapp')
            .single();

        console.log('Admin Phone found:', settings.whatsapp);
        const adminPhone = settings.whatsapp.replace(/\D/g, '');
        const remoteJid = `${adminPhone}@s.whatsapp.net`;

        const message = "🔔 TESTE DE NOTIFICAÇÃO DO ADMIN 🔔\nSe você recebeu isso, o sistema de envio está funcionando!";

        console.log(`Sending to ${remoteJid}...`);

        await aiService.sendMessage(remoteJid, message);
        console.log('Message logic executed.');

    } catch (e) {
        console.error('Test Failed:', e);
    }
};

run();
