const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLastError() {
    console.log('Fetching last 3 errors...');
    const { data: logs } = await supabase
        .from('system_logs')
        .select('details')
        .eq('level', 'error')
        .order('created_at', { ascending: false })
        .limit(1);

    if (logs && logs.length > 0) {
        const fullLog = logs[0];
        const fs = require('fs');
        fs.writeFileSync('backend/last_error_full.json', JSON.stringify(fullLog, null, 2));
        console.log('Full log written to backend/last_error_full.json');
    } else {
        console.log('No recent errors found.');
    }
}

checkLastError();
