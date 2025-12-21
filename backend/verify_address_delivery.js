const aiService = require('./services/aiService');
const { createClient } = require('@supabase/supabase-js');

// Config from aiService.js (hardcoded there)
const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerification() {
    console.log('--- Starting Verification ---');

    // 1. Verify Delivery Fee
    console.log('\n[1] Verifying calculateDeliveryFee...');
    try {
        // Ensure at least one zone exists
        // Insert a temp zone
        const testCepStart = '99000-000';
        const testCepEnd = '99999-999';
        const { data: zone, error: zoneError } = await supabase.from('delivery_zones').insert([{
            name: 'Test Zone',
            cep_start: testCepStart,
            cep_end: testCepEnd,
            fee: 15.50,
            estimated_time: '50-60 min',
            active: true
        }]).select().single();

        if (zoneError) {
            console.log('Zone insertion failed (might already exist or permission issue), trying to fetch existing active zone...');
        }

        const res = await aiService.calculateDeliveryFee('99000-100');
        console.log('Result:', res);

        if (res.estimated_time) {
            console.log('✅ SUCCESS: estimated_time returned.');
        } else {
            console.error('❌ FAILURE: estimated_time MISSING.');
        }

        // Clean up zone
        if (zone) await supabase.from('delivery_zones').delete().eq('id', zone.id);

    } catch (e) {
        console.error('Error in step 1:', e);
    }

    // 2. Verify Register Customer Address
    console.log('\n[2] Verifying registerCustomer...');
    try {
        const phone = '5511999998888';
        const testAddress = {
            name: 'Test User Agent',
            phone: phone,
            address: 'Rua Teste, 123',
            street: 'Rua Teste',
            number: '123',
            cep: '12345-678',
            neighborhood: 'Bairro Teste',
            city: 'Cidade Teste',
            state: 'SP'
        };

        // Delete if exists first
        await supabase.from('customers').delete().eq('phone', phone);

        const regRes = await aiService.registerCustomer(testAddress);
        console.log('Register Result:', regRes);
        const parsed = JSON.parse(regRes);

        if (parsed.success) {
            // Check customer_addresses
            const { data: addresses, error: addrError } = await supabase
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', parsed.customerId);

            if (addrError) console.error('Error fetching addresses:', addrError);

            console.log('Addresses found:', addresses);

            if (addresses && addresses.length > 0) {
                const addr = addresses[0];
                if (addr.street === 'Rua Teste' && addr.is_default) {
                    console.log('✅ SUCCESS: Address saved in customer_addresses correctly.');
                } else {
                    console.error('❌ FAILURE: Address data mismatch.');
                }
            } else {
                console.error('❌ FAILURE: No address record found in customer_addresses.');
            }

            // Cleanup matches
            await supabase.from('customers').delete().eq('id', parsed.customerId);
        } else {
            console.error('Register failed:', parsed);
        }

    } catch (e) {
        console.error('Error in step 2:', e);
    }
}

runVerification();
