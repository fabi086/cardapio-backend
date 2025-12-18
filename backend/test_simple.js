require('dotenv').config();
const aiService = require('./services/aiService');

async function val() {
    const productId = 'e37436ab-c593-42f3-a3bf-b65bd9cf05f2';
    const order1 = {
        customerPhone: '5511999999999',
        items: [{ productId: productId, quantity: 1 }],
        paymentMethod: 'Dinheiro',
        changeFor: 20
    };
    const result1 = await aiService.createOrder(order1);
    console.log('RESULT_START');
    console.log(result1);
    console.log('RESULT_END');
}
val();
