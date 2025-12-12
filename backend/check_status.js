const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log('Fetching settings...');
    const { data: settings, error } = await supabase.from('ai_integration_settings').select('*').single();

    if (error || !settings) {
        console.error('Failed to load settings:', error);
        return;
    }

    const { evolution_api_url, evolution_api_key, instance_name } = settings;
    console.log(`Checking status for instance: ${instance_name} at ${evolution_api_url}`);

    try {
        const url = `${evolution_api_url}/instance/connectionState/${instance_name}`;
        console.log(`GET ${url}`);
        const response = await axios.get(url, {
            headers: { 'apikey': evolution_api_key }
        });
        console.log('Connection State:', JSON.stringify(response.data, null, 2));
    } catch (err) {
        console.error('Error fetching status:', err.message);
        if (err.response) {
            console.error('Response:', err.response.data);
        }
    }
}

checkStatus();
