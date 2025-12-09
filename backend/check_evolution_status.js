const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const run = async () => {
    try {
        const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
        const supabase = createClient(supabaseUrl, supabaseKey);



        // actually fetch ai settings separately
        const { data: aiSettings } = await supabase.from('ai_integration_settings').select('*').single();

        if (!aiSettings) {
            console.error('No AI Settings found');
            return;
        }

        const url = `${aiSettings.evolution_api_url}/instance/connectionState/${aiSettings.instance_name}`;
        const headers = { 'apikey': aiSettings.evolution_api_key };

        console.log(`Checking connection status for instance: ${aiSettings.instance_name}`);
        console.log(`URL: ${url}`);

        try {
            const response = await axios.get(url, { headers });
            console.log('Connection Status:', JSON.stringify(response.data, null, 2));
        } catch (err) {
            console.error('Error fetching status:', err.response?.data || err.message);
        }

    } catch (e) {
        console.error('Script error:', e);
    }
};

run();
