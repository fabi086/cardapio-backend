
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function monitorLogs() {
    console.log('--- Monitoring System Logs (Last 20) ---');
    console.log('Waiting for logs... (Press Ctrl+C to exit)');

    const fetchLogs = async () => {
        const { data, error } = await supabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            if (error.code === '42P01') {
                console.clear();
                console.error('❌ Table system_logs does not exist.');
                console.log('Please run the following SQL in your Supabase Dashboard:');
                console.log(`
        CREATE TABLE IF NOT EXISTS system_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            level TEXT,
            message TEXT,
            details JSONB,
            metadata JSONB
        );
                `);
                process.exit(1);
            } else {
                console.error('Error fetching logs:', error.message);
            }
        } else {
            console.clear();
            console.log(`--- System Logs (Last Update: ${new Date().toLocaleTimeString()}) ---`);
            if (data.length === 0) {
                console.log('No logs found yet.');
            }
            const reversed = [...data].reverse();
            reversed.forEach(log => {
                const time = new Date(log.created_at).toLocaleTimeString();
                const levelIcon = log.level === 'error' ? '❌' : (log.level === 'warning' ? '⚠️' : 'ℹ️');
                console.log(`${time} ${levelIcon} [${log.level.toUpperCase()}] ${log.message}`);
                // if (log.details) console.log('   Details:', JSON.stringify(log.details).substring(0, 100) + '...');
            });
        }
    };

    fetchLogs();
    setInterval(fetchLogs, 5000); // Refresh every 5 seconds
}

monitorLogs();
