
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSystemLogs() {
    console.log('Attempting to create system_logs table...');

    const createTableSql = `
        CREATE TABLE IF NOT EXISTS system_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            level TEXT,
            message TEXT,
            details JSONB,
            metadata JSONB
        );
    `;

    // Try RPC first (common in some setups or if user added it)
    const { error: rpcError } = await supabase.rpc('execute_sql', { query_text: createTableSql });

    if (!rpcError) {
        console.log('✅ Success via RPC execute_sql');
        return;
    }

    console.log('⚠️ RPC failed:', rpcError.message);
    console.log('Checking if table already exists by inserting a test log...');

    // Try to insert directly. If table exists, it works.
    const { error: insertError } = await supabase.from('system_logs').insert([{
        level: 'info',
        message: 'System capabilities check',
        details: { check: 'ok' }
    }]);

    if (!insertError) {
        console.log('✅ Table exists (insert succeeded).');
    } else {
        console.error('❌ Table likely missing and cannot be created automatically.');
        console.error('SERVER LOG: Please run this SQL in Supabase Dashboard:');
        console.log(createTableSql);
    }
}

createSystemLogs();
