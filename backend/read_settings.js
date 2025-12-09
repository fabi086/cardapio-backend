const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function readSettings() {
    const { data: settings, error } = await supabase
        .from('ai_integration_settings')
        .select('*')
        .single();

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    console.log('--- SETTINGS ---');
    console.log('URL:', settings.evolution_api_url);
    console.log('Instance:', settings.instance_name);
    console.log('Key:', settings.evolution_api_key);
    console.log('Active:', settings.is_active);
    console.log('----------------');
}

readSettings();
