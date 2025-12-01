require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking tables...');

    const { error: customersError } = await supabase.from('customers').select('name, address, phone').limit(1);
    if (customersError) {
        console.error('Error checking customers table columns:', customersError.message);
    } else {
        console.log('Customers table exists and has name, address, phone columns.');
    }

    const { error: ordersError } = await supabase.from('orders').select('id').limit(1);
    if (ordersError) {
        console.error('Error checking orders table:', ordersError.message);
    } else {
        console.log('Orders table exists.');
    }

    const { error: itemsError } = await supabase.from('order_items').select('id').limit(1);
    if (itemsError) {
        console.error('Error checking order_items table:', itemsError.message);
    } else {
        console.log('Order_items table exists.');
    }
}

checkTables();
