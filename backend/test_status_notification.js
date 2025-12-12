const aiService = require('./services/aiService');
const { createClient } = require('@supabase/supabase-js');

async function testStatusNotification() {
    console.log('Testing Customer Status Notification...');

    // 1. Get a valid phone number (Admin's number) to test with
    const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
        .from('business_settings')
        .select('whatsapp')
        .single();

    if (!settings || !settings.whatsapp) {
        console.error('No admin whatsapp found to use as test target.');
        return;
    }

    const testPhone = settings.whatsapp; // Use admin phone to receive the test
    console.log(`Sending test notification to: ${testPhone}`);

    try {
        // 2. Get a real order to test
        const { data: lastOrder } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!lastOrder) {
            console.error('No orders found in DB to test with.');
            return;
        }

        console.log(`Using order #${lastOrder.order_number} (ID: ${lastOrder.id}) for test.`);

        // Use the admin phone (testPhone) but keeping the order context
        // Note: This will send a message to the ADMIN phone saying "Status of Order X changed"

        await aiService.sendNotification(testPhone, 'out_for_delivery', lastOrder.id);
        console.log('✅ Notification function called successfully.');
    } catch (error) {
        console.error('❌ Notification failed:', error);
    }
}

testStatusNotification();
