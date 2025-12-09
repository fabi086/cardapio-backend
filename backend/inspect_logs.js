
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLogs() {
    console.log('Fetching last 5 logs with FULL details...');

    const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    data.forEach(log => {
        console.log(`\n[${log.created_at}] ${log.level.toUpperCase()}: ${log.message}`);
        console.log('DETAILS:', JSON.stringify(log.details, null, 2));
    });
}

inspectLogs();
