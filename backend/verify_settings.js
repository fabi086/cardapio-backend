
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
    console.log('Fetching AI Settings...');
    const { data, error } = await supabase
        .from('ai_integration_settings')
        .select('*')
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data) {
        console.log('Settings Found:');
        console.log('Instance Name:', data.instance_name);
        console.log('API URL:', data.evolution_api_url);
        console.log('API Key:', data.evolution_api_key ? data.evolution_api_key.substring(0, 5) + '...' : 'MISSING');
        console.log('Is Active:', data.is_active);
    } else {
        console.log('No settings found.');
    }

    if (data && data.evolution_api_url && data.evolution_api_key) {
        const axios = require('axios');
        try {
            console.log('Checking connection state...');
            const url = `${data.evolution_api_url}/instance/connectionState/${data.instance_name}`;
            const res = await axios.get(url, {
                headers: { 'apikey': data.evolution_api_key }
            });
            console.log('Connection State:', JSON.stringify(res.data, null, 2));
        } catch (e) {
            console.error('Error checking connection:', e.message);
            if (e.response) {
                console.error('Response data:', e.response.data);
            }
        }
    }
}

checkSettings();
