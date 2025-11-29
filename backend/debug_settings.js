require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
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

    console.log('--- Current Settings ---');
    console.log('URL:', `'${data.evolution_api_url}'`);
    console.log('Instance:', `'${data.instance_name}'`);
    console.log('API Key:', data.evolution_api_key ? '(Present)' : '(Missing)');
    console.log('Is Active:', data.is_active);

    // Check for common issues
    if (data.evolution_api_url.endsWith('/')) {
        console.log('⚠️ WARNING: URL has a trailing slash!');
    }
    if (data.instance_name.includes(' ')) {
        console.log('⚠️ WARNING: Instance name contains spaces!');
    }
}

checkSettings();
