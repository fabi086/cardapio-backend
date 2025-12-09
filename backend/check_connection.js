const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: settings } = await supabase
        .from('ai_integration_settings')
        .select('*')
        .single();

    const url = settings.evolution_api_url;
    const key = settings.evolution_api_key;
    const instance = settings.instance_name;

    console.log(`Checking Webhook for ${instance}...`);
    try {
        const res = await axios.get(`${url}/webhook/find/${instance}`, {
            headers: { 'apikey': key }
        });
        console.log('Webhook Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('Webhook error:', e.message);
    }
}

check();
