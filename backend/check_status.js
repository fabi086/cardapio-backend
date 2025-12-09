const axios = require('axios');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    const { data: settings } = await supabase.from('ai_integration_settings').select('*').single();
    const url = `${settings.evolution_api_url}/instance/connectionState/${settings.instance_name}`;

    console.log(`Checking status for ${settings.instance_name}...`);

    try {
        const res = await axios.get(url, {
            headers: { 'apikey': settings.evolution_api_key }
        });
        console.log('Status:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('Error:', e.message);
        if (e.response) console.log('Response:', e.response.data);
    }
}

checkStatus();
