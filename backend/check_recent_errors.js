const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentErrors() {
    console.log('=== Checking Recent Errors (Last 30 min) ===\n');

    const thirtyMinAgo = new Date();
    thirtyMinAgo.setMinutes(thirtyMinAgo.getMinutes() - 30);

    const { data: errors } = await supabase
        .from('system_logs')
        .select('*')
        .in('level', ['error', 'warning'])
        .gte('created_at', thirtyMinAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

    if (!errors || errors.length === 0) {
        console.log('No errors found in last 30 minutes');
        return;
    }

    console.log(`Found ${errors.length} errors/warnings:\n`);

    errors.forEach((err, i) => {
        console.log(`${i + 1}. [${err.level.toUpperCase()}] ${new Date(err.created_at).toLocaleTimeString()}`);
        console.log(`   Message: ${err.message}`);
        if (err.details) {
            console.log(`   Details: ${JSON.stringify(err.details, null, 2)}`);
        }
        console.log('');
    });
}

checkRecentErrors();
