require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKey() {
    const envKey = process.env.EVOLUTION_API_KEY;
    console.log('ENV Key (first 5):', envKey ? envKey.substring(0, 5) : 'MISSING');

    const { data: settings, error } = await supabase
        .from('ai_integration_settings')
        .select('*')
        .single();

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    const dbKey = settings.evolution_api_key;
    console.log('DB Key (first 5):', dbKey ? dbKey.substring(0, 5) : 'MISSING');

    if (envKey === dbKey) {
        console.log('✅ Keys match.');
    } else {
        console.log('❌ Keys DO NOT match.');
        console.log('Updating DB with ENV key...');

        const { error: updateError } = await supabase
            .from('ai_integration_settings')
            .update({ evolution_api_key: envKey })
            .eq('id', settings.id);

        if (updateError) {
            console.error('Error updating DB:', updateError);
        } else {
            console.log('✅ DB updated successfully.');
        }
    }
}

checkKey();
