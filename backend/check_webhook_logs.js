const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWebhookLogs() {
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    const { data: logs } = await supabase
        .from('system_logs')
        .select('*')
        .gte('created_at', tenMinutesAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

    const result = {
        totalLogs: logs?.length || 0,
        webhookPayloads: 0,
        logs: logs || [],
        diagnosis: ''
    };

    if (!logs || logs.length === 0) {
        result.diagnosis = 'NO_LOGS_FOUND - Webhook not receiving requests OR backend not deployed';
    } else {
        const webhookPayloads = logs.filter(l => l.message === 'Webhook Raw Payload');
        result.webhookPayloads = webhookPayloads.length;

        if (webhookPayloads.length > 0) {
            result.diagnosis = 'WEBHOOK_RECEIVING_REQUESTS';
            result.lastPayload = webhookPayloads[0];
        } else {
            result.diagnosis = 'NO_WEBHOOK_PAYLOADS - Check Evolution API webhook config';
        }
    }

    fs.writeFileSync('webhook_logs.json', JSON.stringify(result, null, 2));
    console.log('Results saved to webhook_logs.json');
    console.log('Diagnosis:', result.diagnosis);
    console.log('Total logs:', result.totalLogs);
    console.log('Webhook payloads:', result.webhookPayloads);
}

checkWebhookLogs();
