require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const NEW_KEY = '8296D4AC1556-491F-8B46-6CEB865FE8E6';

async function updateKey() {
    console.log('Updating API Key in database...');

    // First, get the ID of the row to update (assuming single row for settings)
    const { data: settings, error: fetchError } = await supabase
        .from('ai_integration_settings')
        .select('id')
        .single();

    if (fetchError) {
        console.error('Error fetching settings:', fetchError);
        return;
    }

    const { error: updateError } = await supabase
        .from('ai_integration_settings')
        .update({ evolution_api_key: NEW_KEY })
        .eq('id', settings.id);

    if (updateError) {
        console.error('Error updating key:', updateError);
    } else {
        console.log('✅ API Key updated successfully in Database.');
    }
}

updateKey();
