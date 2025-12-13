const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSendMedia() {
    console.log('Fetching settings...');
    const { data: settings } = await supabase.from('ai_integration_settings').select('*').single();

    if (!settings) { console.error('No settings'); return; }

    const { evolution_api_url, evolution_api_key, instance_name } = settings;
    // Target number
    const number = '5511966887073';
    const mediaUrl = 'https://t4.ftcdn.net/jpg/00/97/58/97/360_F_97589769_t45CqXyzjz0KXwoBZT9PRaWGHRk5hQqQ.jpg'; // Public cat image

    const url = `${evolution_api_url}/message/sendMedia/${instance_name}`;
    const payload = {
        number: number,
        options: {
            delay: 1200,
            presence: 'composing'
        },
        mediatype: 'image',
        caption: "Teste Media (Flat)",
        media: mediaUrl
    };

    console.log(`Sending Media to ${number} via ${url}...`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

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

testSendMedia();
