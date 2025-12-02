require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://pluryiqzywfsovrcuhat.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA'
);

async function checkOrder() {
    // Get order #26
    const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', 26)
        .single();

    console.log('Order #26:', order);

    if (order) {
        // Get items for this order
        const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

        console.log('Items:', items);
        console.log('Item count:', items?.length || 0);
    }
}

checkOrder();
