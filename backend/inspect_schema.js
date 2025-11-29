require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('Inspecting customers table...');
    const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('*')
        .limit(1);

    if (custError) console.error('Error customers:', custError);
    else if (customers.length > 0) console.log('Customers columns:', Object.keys(customers[0]));
    else console.log('Customers table empty, cannot infer columns.');

    console.log('Inspecting orders table...');
    const { data: orders, error: ordError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (ordError) console.error('Error orders:', ordError);
    else if (orders.length > 0) console.log('Orders columns:', Object.keys(orders[0]));
    else console.log('Orders table empty, cannot infer columns.');

    console.log('Inspecting products table...');
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (prodError) console.error('Error products:', prodError);
    else if (products.length > 0) console.log('Products columns:', Object.keys(products[0]));
    else console.log('Products table empty, cannot infer columns.');
}

inspect();
