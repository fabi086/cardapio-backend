require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing connection to:', supabaseUrl);

    // Test 1: List tables (not possible directly with client, but we can try to select from coupons)
    console.log('Attempting to select from coupons...');
    const { data, error } = await supabase.from('coupons').select('*').limit(1);

    if (error) {
        console.error('Error selecting from coupons:', error);
    } else {
        console.log('Success! Data:', data);
    }

    // Test 2: Insert
    console.log('Attempting to insert into coupons...');
    const { data: insertData, error: insertError } = await supabase
        .from('coupons')
        .insert([{
            code: 'TEST_SCRIPT_' + Date.now(),
            discount_type: 'percentage',
            discount_value: 10
        }])
        .select();

    if (insertError) {
        console.error('Error inserting:', insertError);
    } else {
        console.log('Insert Success:', insertData);
    }
}

test();
