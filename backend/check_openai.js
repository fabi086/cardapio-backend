require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOpenAI() {
    const { data: settings } = await supabase.from('ai_integration_settings').select('*').single();
    console.log('OpenAI Key in DB:', settings.openai_api_key ? 'PRESENT (starts with ' + settings.openai_api_key.substring(0, 3) + ')' : 'MISSING');
}

checkOpenAI();
