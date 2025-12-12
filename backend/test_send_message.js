const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSend() {
    console.log('Fetching settings...');
    const { data: settings } = await supabase.from('ai_integration_settings').select('*').single();

    if (!settings) { console.error('No settings'); return; }

    const { evolution_api_url, evolution_api_key, instance_name } = settings;
    // Target number from logs
    const number = '5511966887073';

    const url = `${evolution_api_url}/message/sendText/${instance_name}`;
    const payload = {
        number: number,
        options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: true
        },
        text: "Teste de envio direto do debug script"
    };

    console.log(`Sending to ${number} via ${url}...`);

    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'apikey': evolution_api_key
            }
        });
        console.log('Success:', response.data);
    } catch (err) {
        console.error('Failed:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

testSend();
