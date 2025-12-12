const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductionData() {
    console.log('--- SYSTEM LOGS (Last 5 Errors) ---');
    const { data: logs, error: logsError } = await supabase
        .from('system_logs')
        .select('*')
        .eq('level', 'error')
        .order('created_at', { ascending: false })
        .limit(5);

    if (logsError) console.error('logs error:', logsError);
    else {
        logs.forEach(l => {
            console.log(`[${l.created_at}] ${l.message}`);
            console.log(JSON.stringify(l.details, null, 2));
            console.log('-----------------------------');
        });
    }

    console.log('\n--- CUSTOMERS (Last 5) ---');
    const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('name, phone, created_at, orders(count)')
        .order('created_at', { ascending: false })
        .limit(5);

    if (custError) console.error('customers error:', custError);
    else {
        console.log(`Found ${customers.length} customers.`);
        customers.forEach(c => {
            console.log(`Name: ${c.name}, Phone: ${c.phone}, Orders: ${c.orders ? c.orders[0].count : 0}`);
        });
    }
}

checkProductionData();
