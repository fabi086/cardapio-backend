require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listInstances() {
    console.log('Fetching settings...');
    const { data: settings } = await supabase
        .from('ai_integration_settings')
        .select('*')
        .single();

    const url = `${settings.evolution_api_url}/instance/fetchInstances`;
    console.log(`Listing instances from ${url}...`);

    try {
        const response = await axios.get(url, {
            headers: {
                'apikey': settings.evolution_api_key
            }
        });

        console.log('✅ Instances listed successfully!');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Failed to list instances.');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

listInstances();
