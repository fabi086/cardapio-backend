require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use hardcoded credentials
const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCheckOrderStatus() {
    console.log('Testing checkOrderStatus...');

    // 1. Get a recent order to test with
    const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching order:', error);
        return;
    }

    console.log('Found order:', { id: order.id, number: order.order_number });

    // 2. Simulate tool logic from aiService.js
    async function checkOrderStatus({ orderId }) {
        console.log('Tool called: checkOrderStatus', { orderId });

        // Try to find by UUID first
        let { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('status, total, created_at, order_number')
            .eq('id', orderId)
            .single();

        if (orderError) {
            console.log('Not found by ID, trying by order_number...');
            // Fallback: try to find by order_number (if input is a number)
            if (!isNaN(orderId)) {
                const { data: orderByNum, error: numError } = await supabase
                    .from('orders')
                    .select('status, total, created_at, order_number')
                    .eq('order_number', orderId)
                    .single();

                if (orderByNum) {
                    orderData = orderByNum;
                    orderError = null;
                }
            }
        }

        if (orderError || !orderData) return JSON.stringify({ error: 'Order not found' });
        return JSON.stringify(orderData);
    }

    // Test with UUID
    console.log('\n--- Test 1: UUID ---');
    const resultUUID = await checkOrderStatus({ orderId: order.id });
    console.log('Result UUID:', resultUUID);

    // Test with Order Number
    console.log('\n--- Test 2: Order Number ---');
    const resultNum = await checkOrderStatus({ orderId: order.order_number });
    console.log('Result Number:', resultNum);
}

testCheckOrderStatus();
