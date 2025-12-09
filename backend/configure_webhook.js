const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

const WEBHOOK_URL = 'https://cardapio-backend.vercel.app/api/ai/webhook';

async function configure() {
    const { data: settings } = await supabase
        .from('ai_integration_settings')
        .select('*')
        .single();

    const url = settings.evolution_api_url;
    const key = settings.evolution_api_key;
    const instance = settings.instance_name;

    console.log(`Configuring Webhook for ${instance}...`);

    try {
        // Try simplified payload first
        const payload = {
            "webhook": {
                "url": WEBHOOK_URL,
                "enabled": true,
                "events": [
                    "MESSAGES_UPSERT",
                    "MESSAGES_UPDATE"
                ]
            }
        };

        console.log('Sending payload:', JSON.stringify(payload, null, 2));

        const res = await axios.post(`${url}/webhook/set/${instance}`, payload, {
            headers: {
                'apikey': key,
                'Content-Type': 'application/json'
            }
        });

        console.log('Webhook Configured Successfully!');
        console.log('Response:', JSON.stringify(res.data, null, 2));

    } catch (e) {
        console.log('Configuration error:', e.message);
        if (e.response) {
            console.log('Error status:', e.response.status);
            console.log('Error data:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

configure();
