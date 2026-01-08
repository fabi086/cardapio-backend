const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('=== DIAGNOSTIC: Customer Lookup & Order Tracking ===\n');

    // 1. Check recent error logs
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: errorLogs } = await supabase
        .from('system_logs')
        .select('*')
        .eq('level', 'error')
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('1. Recent Errors (last hour):');
    if (errorLogs && errorLogs.length > 0) {
        errorLogs.forEach((log, i) => {
            console.log(`   ${i + 1}. ${new Date(log.created_at).toLocaleTimeString()}: ${log.message}`);
            if (log.details) console.log(`      Details:`, JSON.stringify(log.details).substring(0, 200));
        });
    } else {
        console.log('   No errors found');
    }

    // 2. Check recent orders
    const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n2. Recent Orders:');
    if (recentOrders && recentOrders.length > 0) {
        recentOrders.forEach((o, i) => {
            console.log(`   ${i + 1}. #${o.order_number} - ${o.customer_name} (${o.customer_phone})`);
            console.log(`      ID: ${o.id} - ${new Date(o.created_at).toLocaleString()}`);
        });
    } else {
        console.log('   No orders found');
    }

    // 3. Test customer lookup with recent phone
    if (recentOrders && recentOrders.length > 0) {
        const testPhone = recentOrders[0].customer_phone;
        console.log(`\n3. Testing customer lookup for: ${testPhone}`);

        const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', testPhone)
            .single();

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else if (customer) {
            console.log(`   ✅ Found: ${customer.name}`);
            console.log(`      Address: ${customer.address || customer.street}`);
            console.log(`      Number: ${customer.number || 'NOT SET'}`);
        } else {
            console.log('   ❌ Customer not found');
        }
    }

    // 4. Check if order tracking route exists
    console.log('\n4. Order Tracking:');
    console.log('   Route should be: /order/:id');
    console.log('   Example: https://cardapio-frontend-u6qq.vercel.app/order/[ORDER_ID]');
}

diagnose();
