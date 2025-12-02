require('dotenv').config();
const aiService = require('./services/aiService');

async function testCreateOrder() {
    console.log('Testing createOrder with sample data...');

    // Primeiro registra um cliente
    const customerData = {
        name: 'Test Cliente',
        phone: '11987654321',
        address: 'Rua Teste, 123',
        cep: '04883020'
    };

    console.log('1. Registering customer...');
    const registerResult = await aiService.registerCustomer(customerData);
    console.log('Register result:', registerResult);

    // Depois cria um pedido
    const orderData = {
        customerPhone: '11987654321',
        items: [
            {
                productId: '1b60150f-18ed-45ce-9499-fdf9a032484f', // Pizza Calabresa
                quantity: 1
            },
            {
                productId: '60c9c606-cbd1-4de4-8732-41086bffb569', // Coca-Cola
                quantity: 2
            }
        ],
        paymentMethod: 'PIX',
        cep: '04883020',
        deliveryType: 'delivery'
    };

    console.log('2. Creating order...');
    const orderResult = await aiService.createOrder(orderData);
    console.log('Order result:', orderResult);
}

testCreateOrder().catch(console.error);
