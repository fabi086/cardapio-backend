require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSend() {
    console.log('1. Fetching Settings...');
    const { data: settings, error } = await supabase
        .from('ai_integration_settings')
        .select('*')
        .single();

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    console.log(`   URL: ${settings.evolution_api_url}`);
    console.log(`   Instance: ${settings.instance_name}`);
    console.log(`   API Key: ${settings.evolution_api_key ? '***' : 'MISSING'}`);

    // Use a dummy number or ask user to input. 
    // For test, we'll use a standard format Brazilian number (example)
    // The user can edit this file if they want to test their real number, 
    // but the error response is what matters most here.
    const testNumber = '5511999999999';

    console.log(`2. Attempting to send message to ${testNumber}...`);

    try {
        const url = `${settings.evolution_api_url}/message/sendText/${settings.instance_name}`;
        const payload = {
            number: testNumber,
            text: "Teste de conexão do Antigravity",
            delay: 1200,
            linkPreview: false
        };

        console.log('   Endpoint:', url);
        // console.log('   Payload:', JSON.stringify(payload, null, 2));

        const response = await axios.post(url, payload, {
            headers: {
                'apikey': settings.evolution_api_key,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ SUCCESS! Message sent.');
        console.log('   Response:', response.data);

    } catch (error) {
        console.error('❌ FAILED to send message.');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('   Error:', error.message);
        }
    }
}

testSend();
