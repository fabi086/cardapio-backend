require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use hardcoded credentials to match what we know works
const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFrontendFlow() {
    console.log('Starting frontend flow simulation...');

    const formData = {
        name: 'Frontend Test User',
        phone: '5511988887777',
        cep: '01001-000',
        street: 'Praça da Sé',
        number: '100',
        complement: 'Lado ímpar',
        neighborhood: 'Sé',
        city: 'São Paulo',
        state: 'SP',
        address: 'Praça da Sé, 100, Sé, São Paulo/SP',
        paymentMethod: 'pix',
        changeFor: '',
        deliveryFee: 5.00
    };

    try {
        // --- Step 1: Create or Update Customer (CheckoutModal.jsx) ---
        console.log('Step 1: Create/Update Customer');
        let currentCustomerId = null;

        // Check if exists
        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', formData.phone)
            .single();

        const customerData = {
            phone: formData.phone,
            name: formData.name,
            address: formData.address,
            cep: formData.cep,
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            updated_at: new Date()
        };

        if (existing) {
            console.log('Customer exists, updating...');
            currentCustomerId = existing.id;
            const { error: updateError } = await supabase
                .from('customers')
                .update(customerData)
                .eq('id', currentCustomerId);

            if (updateError) throw new Error('Error updating customer: ' + updateError.message);
        } else {
            console.log('Creating new customer...');
            const { data: newCustomer, error: insertError } = await supabase
                .from('customers')
                .insert([customerData])
                .select()
                .single();

            if (insertError) throw new Error('Error creating customer: ' + insertError.message);
            currentCustomerId = newCustomer.id;
        }

        console.log('Customer ID:', currentCustomerId);

        // --- Step 2: Submit Order (CartContext.jsx) ---
        console.log('Step 2: Submit Order');

        // 2.1 Get Order Number
        const { data: lastOrder, error: lastOrderError } = await supabase
            .from('orders')
            .select('order_number')
            .order('order_number', { ascending: false })
            .limit(1)
            .single();

        // Handle the case where table is empty (error code PGRST116)
        if (lastOrderError && lastOrderError.code !== 'PGRST116') {
            console.log('Warning: Error fetching last order:', lastOrderError);
        }

        const orderNumber = (lastOrder?.order_number || 0) + 1;
        console.log('Generated Order Number:', orderNumber);

        // 2.2 Insert Order
        const orderPayload = {
            order_number: orderNumber,
            customer_name: formData.name,
            customer_phone: formData.phone,
            customer_address: formData.address,
            customer_cep: formData.cep,
            customer_id: currentCustomerId,
            payment_method: formData.paymentMethod,
            change_for: formData.changeFor,
            delivery_fee: formData.deliveryFee,
            total: 100.00 + formData.deliveryFee, // Mock total
            discount: 0,
            coupon_code: null,
            status: 'Pendente'
        };

        console.log('Inserting order:', orderPayload);

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([orderPayload])
            .select()
            .single();

        if (orderError) throw new Error('Error inserting order: ' + orderError.message);
        console.log('Order created:', order.id);

        // 2.3 Insert Order Items
        const itemsToInsert = [
            {
                order_id: order.id,
                product_id: 1, // Assuming product 1 exists
                product_name: 'Test Product',
                quantity: 1,
                price: 100.00,
                modifiers: {}
            }
        ];

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert);

        if (itemsError) throw new Error('Error inserting items: ' + itemsError.message);
        console.log('Items inserted successfully');

        console.log('SUCCESS: Flow completed without errors.');

    } catch (error) {
        console.error('FAILED:', error.message);
        console.error('Full error:', error);
    }
}

testFrontendFlow();
