const axios = require('axios');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// USER REQUESTED URL
const BACKEND_URL = 'https://cardapio-backend.vercel.app';

async function setWebhook() {
    const { data: settings } = await supabase.from('ai_integration_settings').select('*').single();

    const url = `${settings.evolution_api_url}/webhook/set/${settings.instance_name}`;

    const payload = {
        webhook: {
            url: `${BACKEND_URL}/api/ai/webhook`,
            byEvents: true,
            events: [
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE",
                "SEND_MESSAGE"
            ],
            enabled: true
        }
    };

    console.log(`Setting webhook to ${payload.webhook.url}...`);

    try {
        const res = await axios.post(url, payload, {
            headers: { 'apikey': settings.evolution_api_key }
        });
        console.log('✅ Webhook updated successfully!');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('❌ Failed to set webhook.');
        if (e.response) {
            console.log('Status:', e.response.status);
            console.log('Data:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.log('Error:', e.message);
        }
    }
}

setWebhook();
