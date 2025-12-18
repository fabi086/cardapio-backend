require('dotenv').config();
const aiService = require('./services/aiService');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
// Note: test needs service role or valid key if RLS enabled, but usually .env has it.

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStock() {
    console.log('--- TESTING STOCK CONTROL ---');

    // Use existing product: X-Salada Clássico
    const productId = 'e37436ab-c593-42f3-a3bf-b65bd9cf05f2';
    console.log(`Using product ID: ${productId}`);

    try {
        // Register Customer First
        await aiService.registerCustomer({
            name: 'Test Stock User',
            phone: '5511999999999',
            address: 'Rua Teste Stock',
            cep: '12345678'
        });
        console.log('Customer registered.');

        // 2. Order 1 unit (Should Success)
        console.log('\nAttempting to buy 1 unit...');
        const order1 = {
            customerPhone: '5511999999999',
            items: [{ productId: productId, quantity: 1 }],
            paymentMethod: 'Dinheiro',
            changeFor: 20
        };
        const result1 = await aiService.createOrder(order1);
        try {
            const r1 = JSON.parse(result1);
            if (r1.error) console.error('RESULT 1 ERROR:', r1.error);
            else console.log('Result 1 Success:', r1.orderNumber);
        } catch (e) { console.log('Result 1 raw:', result1); }

        // Verify stock is now 1
        const { data: p1 } = await supabase.from('products').select('stock_quantity').eq('id', productId).single();
        console.log(`Stock after order 1: ${p1.stock_quantity} (Expected: 1)`);

        // 3. Order 2 units (Should Fail: Stock is 1)
        console.log('\nAttempting to buy 2 units (Stock is 1)...');
        const order2 = {
            customerPhone: '5511999999999',
            items: [{ productId: productId, quantity: 2 }],
            paymentMethod: 'Dinheiro'
        };
        const result2 = await aiService.createOrder(order2);
        try {
            const r2 = JSON.parse(result2);
            if (r2.error) console.log('RESULT 2 EXPECTED ERROR:', r2.error);
            else console.error('RESULT 2 UNEXPECTED SUCCESS:', r2);
        } catch (e) { console.log('Result 2 raw:', result2); }

        // Verify stock is still 1
        const { data: p2 } = await supabase.from('products').select('stock_quantity').eq('id', productId).single();
        console.log(`Stock after order 2: ${p2.stock_quantity} (Expected: 1)`);

    } catch (e) {
        console.error('Test Error:', e);
    }
}

testStock();
