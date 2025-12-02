require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createInstance() {
    console.log('Fetching settings...');
    const { data: settings } = await supabase
        .from('ai_integration_settings')
        .select('*')
        .single();

    if (!settings) {
        console.error('Settings not found');
        return;
    }

    const url = `${settings.evolution_api_url}/instance/create`;
    const payload = {
        instanceName: settings.instance_name,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
    };

    console.log(`Creating instance '${settings.instance_name}' at ${url}...`);

    try {
        const response = await axios.post(url, payload, {
            headers: {
                'apikey': settings.evolution_api_key,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Instance created successfully!');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Failed to create instance.');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

createInstance();
