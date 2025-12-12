const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCustomers() {
    console.log('Checking customers table...');
    const { data: customers, error } = await supabase
        .from('customers')
        .select(`
            *,
            orders (
                id,
                created_at,
                total
            )
        `)
        .limit(20);

    if (error) {
        console.error('Error fetching customers:', error);
        return;
    }

    console.log(`Found ${customers.length} customers.`);
    customers.forEach(c => {
        console.log(`- ${c.name} (${c.phone}): ${c.orders ? c.orders.length : 0} orders`);
    });

    console.log('\nChecking orders table for unlinked customers...');
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, customer_id')
        .limit(20);

    if (ordersError) {
        console.error('Error fetching orders:', ordersError);
    } else {
        console.log(`Found ${orders.length} orders sample.`);
        orders.forEach(o => {
            console.log(`Order: ${o.customer_name} (${o.customer_phone}) - CustomerID: ${o.customer_id}`);
        });
    }
}

checkCustomers();
