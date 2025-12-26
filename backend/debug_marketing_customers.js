require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key (Anon) exists:', !!supabaseKey);
console.log('Service Role Key exists:', !!serviceKey);

async function testFetch(key, name) {
    if (!key) {
        console.log(`[${name}] Skipping - No key provided`);
        return;
    }
    const supabase = createClient(supabaseUrl, key);
    const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, created_at')
        .limit(5);

    if (error) {
        console.log(`[${name}] Error:`, error.message);
    } else {
        console.log(`[${name}] Success! Found ${data.length} customers.`);
        if (data.length > 0) {
            console.log(`[${name}] Sample:`, data[0]);
        }
    }
}

async function run() {
    console.log('--- Testing with Anon Key ---');
    await testFetch(supabaseKey, 'ANON');

    console.log('\n--- Testing with Service Role Key ---');
    await testFetch(serviceKey, 'SERVICE_ROLE');
}

run();
