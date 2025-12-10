require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {

    // Removed customer/order/product inspection for brevity checking settings only


    console.log('Inspecting ai_integration_settings table...');
    const { data: aiSettings, error: aiError } = await supabase
        .from('ai_integration_settings')
        .select('*')
        .limit(1);

    if (aiError) console.error('Error ai_integration_settings:', aiError);
    else if (aiSettings && aiSettings.length > 0) console.log('AI Settings columns:', Object.keys(aiSettings[0]));
    else console.log('ai_integration_settings table empty/missing.');

    console.log('Inspecting business_settings table...');
    const { data: busSettings, error: busError } = await supabase
        .from('business_settings')
        .select('*')
        .limit(1);

    if (busError) console.error('Error business_settings:', busError);
    else if (busSettings && busSettings.length > 0) console.log('Business Settings columns:', Object.keys(busSettings[0]));
    else console.log('business_settings table empty/missing.');
}

inspect();
