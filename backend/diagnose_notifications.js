const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('=== DIAGNOSTIC: Notifications & Customer Lookup ===\n');

    // 1. Check business_settings for admin WhatsApp
    const { data: businessSettings } = await supabase
        .from('business_settings')
        .select('whatsapp')
        .single();

    console.log('1. Admin WhatsApp Configuration:');
    if (businessSettings?.whatsapp) {
        console.log(`   ✅ Configured: ${businessSettings.whatsapp}`);
    } else {
        console.log('   ❌ NOT CONFIGURED - This is why you\'re not receiving WhatsApp notifications!');
        console.log('   Fix: Go to Admin > Settings and set the WhatsApp number');
    }

    // 2. Check AI integration settings
    const { data: aiSettings } = await supabase
        .from('ai_integration_settings')
        .select('whatsapp')
        .single();

    console.log('\n2. AI Integration WhatsApp:');
    if (aiSettings?.whatsapp) {
        console.log(`   ✅ Configured: ${aiSettings.whatsapp}`);
    } else {
        console.log('   ⚠️ Not set in AI settings (uses business_settings)');
    }

    // 3. Check recent orders to see if notifications were attempted
    const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

    console.log('\n3. Recent Orders:');
    if (recentOrders && recentOrders.length > 0) {
        recentOrders.forEach(o => {
            console.log(`   - #${o.order_number} - ${o.customer_name} - ${new Date(o.created_at).toLocaleString()}`);
        });
    } else {
        console.log('   No recent orders found');
    }

    // 4. Check if there are customers in database
    const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

    console.log(`\n4. Total Customers in Database: ${customerCount}`);

    // 5. Test customer lookup with a sample phone
    console.log('\n5. Testing Customer Lookup:');
    console.log('   Enter a phone number to test (or press Enter to skip):');
    // For automated test, we'll check if there are any customers
    if (customerCount > 0) {
        const { data: sampleCustomer } = await supabase
            .from('customers')
            .select('name, phone')
            .limit(1)
            .single();

        if (sampleCustomer) {
            console.log(`   Sample customer found: ${sampleCustomer.name} - ${sampleCustomer.phone}`);
            console.log('   ✅ Customer lookup should work for this phone');
        }
    }

    // 6. Check push notification subscriptions
    const { count: pushSubCount } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });

    console.log(`\n6. Push Notification Subscriptions: ${pushSubCount}`);
    if (pushSubCount === 0) {
        console.log('   ⚠️ No push subscriptions - you won\'t receive browser notifications');
        console.log('   Fix: Click "Allow" when browser asks for notification permission');
    }

    console.log('\n=== SUMMARY ===');
    const issues = [];
    if (!businessSettings?.whatsapp) issues.push('Admin WhatsApp not configured');
    if (pushSubCount === 0) issues.push('No push subscriptions');

    if (issues.length > 0) {
        console.log('❌ Issues found:');
        issues.forEach(i => console.log(`   - ${i}`));
    } else {
        console.log('✅ All configurations look good!');
    }
}

diagnose();
