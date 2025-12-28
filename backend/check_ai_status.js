const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAIStatus() {
    const result = {
        aiSettings: null,
        recentLogs: [],
        businessSettings: null,
        issues: []
    };

    // 1. Check AI Integration Settings
    const { data: aiSettings } = await supabase
        .from('ai_integration_settings')
        .select('*')
        .single();

    result.aiSettings = {
        isActive: aiSettings?.is_active || false,
        hasEvolutionUrl: !!aiSettings?.evolution_api_url,
        hasInstanceName: !!aiSettings?.instance_name,
        hasEvolutionKey: !!aiSettings?.evolution_api_key,
        hasOpenAIKey: !!aiSettings?.openai_api_key,
        evolutionUrl: aiSettings?.evolution_api_url,
        instanceName: aiSettings?.instance_name
    };

    // 2. Check recent logs
    const { data: logs } = await supabase
        .from('system_logs')
        .select('level, message, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    result.recentLogs = logs || [];

    // 3. Check WhatsApp
    const { data: businessSettings } = await supabase
        .from('business_settings')
        .select('whatsapp')
        .single();

    result.businessSettings = {
        whatsapp: businessSettings?.whatsapp || null
    };

    // 4. Identify issues
    if (!aiSettings?.is_active) result.issues.push('AI_DISABLED');
    if (!aiSettings?.evolution_api_url) result.issues.push('NO_EVOLUTION_URL');
    if (!aiSettings?.instance_name) result.issues.push('NO_INSTANCE_NAME');
    if (!aiSettings?.evolution_api_key) result.issues.push('NO_EVOLUTION_KEY');
    if (!aiSettings?.openai_api_key) result.issues.push('NO_OPENAI_KEY');

    fs.writeFileSync('ai_status.json', JSON.stringify(result, null, 2));
    console.log('Status saved to ai_status.json');
}

checkAIStatus();
