
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    console.log('Fetching last 20 logs...');

    const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No logs found.');
        return;
    }

    console.log(`Found ${data.length} logs.`);
    data.forEach(log => {
        console.log(`[${new Date(log.created_at).toLocaleString()}] [${log.level}] ${log.message}`);
        if (log.details) {
            console.log('Details:', JSON.stringify(log.details, null, 2));
        }
        console.log('---');
    });
}

checkLogs();
