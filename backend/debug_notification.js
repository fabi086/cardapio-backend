require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const aiService = require('./services/aiService');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runDebug() {
    console.log('--- Checking Settings ---');
    const { data: settings, error } = await supabase.from('ai_integration_settings').select('*').single();
    if (error) {
        console.error('Error fetching settings:', error);
    } else {
        console.log('Settings found:');
        console.log('- Evolution API URL:', settings.evolution_api_url);
        console.log('- Instance Name:', settings.instance_name);
        console.log('- API Key Present:', !!settings.evolution_api_key);
        console.log('- Is Active:', settings.is_active);
    }

    console.log('\n--- Checking Recent Logs ---');
    const { data: logs, error: logError } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (logError) {
        console.error('Error fetching logs:', logError);
    } else {
        logs.forEach(log => {
            console.log(`[${log.level}] ${log.created_at}: ${log.message}`, log.details);
        });
    }

    // Uncomment to force a test notification if you have a valid phone number
    // console.log('\n--- Sending Test Notification ---');
    // await aiService.sendNotification('5511999999999', 'approved', '12345'); 
}

runDebug();
