require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function readAllSettings() {
    const { data: settings, error } = await supabase
        .from('ai_integration_settings')
        .select('*');

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    console.log('Found rows:', settings.length);
    settings.forEach((s, i) => {
        console.log(`Row ${i}: ID=${s.id}, Key=${s.evolution_api_key ? s.evolution_api_key.substring(0, 5) + '...' : 'MISSING'}`);
    });
}

readAllSettings();
