const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

const fs = require('fs');

async function checkProductionData() {
    let output = '';
    const log = (msg) => { output += msg + '\n'; };

    log('--- SYSTEM LOGS (Last 5 Errors/Warnings) ---');
    const { data: logs, error: logsError } = await supabase
        .from('system_logs')
        .select('*')
        .in('level', ['error', 'warning']) // Fetch warnings too
        .order('created_at', { ascending: false })
        .limit(5);

    if (logsError) log('logs error: ' + logsError.message);
    else {
        logs.forEach(l => {
            log(`[${l.created_at}] [${l.level}] ${l.message}`);
            log(JSON.stringify(l.details, null, 2));
            log('-----------------------------');
        });
    }

    log('\n--- CUSTOMERS (All) ---');
    const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('name, phone, created_at, orders(count)')
        .order('created_at', { ascending: false });

    if (custError) log('customers error: ' + custError.message);
    else {
        log(`Found ${customers.length} customers.`);
        customers.forEach(c => {
            log(`Name: ${c.name}, Phone: ${c.phone}, Orders: ${c.orders ? c.orders[0].count : 0}`);
        });
    }

    fs.writeFileSync('backend/debug_output.txt', output);
    console.log('Debug data written to backend/debug_output.txt');
}

checkProductionData();
