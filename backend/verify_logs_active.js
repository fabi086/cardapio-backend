
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyLogs() {
    console.log('Testing access to system_logs table...');

    // 1. Try to insert
    const { error: insertError } = await supabase.from('system_logs').insert([{
        level: 'info',
        message: 'Manual verification of log table',
        details: { status: 'active' }
    }]);

    if (insertError) {
        console.error('❌ Insert failed:', insertError.message);
        return;
    }

    console.log('✅ Insert successful.');

    // 2. Try to read
    const { data, error: readError } = await supabase
        .from('system_logs')
        .select('*')
        .limit(1)
        .order('created_at', { ascending: false });

    if (readError) {
        console.error('❌ Read failed:', readError.message);
        return;
    }

    console.log('✅ Read successful. Latest log:', data[0].message);
}

verifyLogs();
