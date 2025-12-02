require('dotenv').config();
const aiService = require('./services/aiService');

async function testCreateOrder() {
    console.log('Testing createOrder...');
    try {
        // First register a customer
        const customer = {
            name: 'Test User',
            phone: '5511999999999',
            address: 'Rua Teste, 123',
            cep: '12345-678',
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Bairro Teste',
            city: 'Cidade Teste',
            state: 'SP'
        };
        console.log('Registering customer...');
        await aiService.registerCustomer(customer);

        // Then create order
        const order = {
            customerPhone: '5511999999999',
            items: [
                { productId: 1, quantity: 1 } // Assuming product ID 1 exists
            ],
            paymentMethod: 'Dinheiro',
            changeFor: 50,
            deliveryFee: 5
        };
        console.log('Creating order...');
        const result = await aiService.createOrder(order);
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

testCreateOrder();
