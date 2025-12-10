require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLastOrders() {
    console.log('Fetching last 5 orders...');
    const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, status, customer_phone, customer_name')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkLastOrders();
