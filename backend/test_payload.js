
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPayload() {
    console.log('Fetching Settings...');
    const { data } = await supabase.from('ai_integration_settings').select('*').single();
    if (!data) return;

    const url = `${data.evolution_api_url}/message/sendText/${data.instance_name}`;
    const headers = { 'apikey': data.evolution_api_key, 'Content-Type': 'application/json' };
    const phone = '5511977966866';

    // Variant 1: Flat text
    console.log('Testing Variant 1: Flat "text" property');
    try {
        const payload = {
            number: phone,
            text: "Teste Variante 1",
            options: { delay: 1000 }
        };
        const res = await axios.post(url, payload, { headers });
        console.log('Success!', res.data);
    } catch (e) {
        console.error('Failed Variant 1:', e.response?.data || e.message);
    }

    // Variant 2: textMessage
    console.log('Testing Variant 2: Nested "textMessage" property');
    try {
        const payload = {
            number: phone,
            textMessage: { text: "Teste Variante 2" },
            options: { delay: 1000 }
        };
        const res = await axios.post(url, payload, { headers });
        console.log('Success!', res.data);
    } catch (e) {
        console.error('Failed Variant 2:', JSON.stringify(e.response?.data || e.message));
    }
}

testPayload();
