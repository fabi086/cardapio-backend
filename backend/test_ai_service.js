require('dotenv').config();
const aiService = require('./services/aiService');

async function test() {
    console.log('Testing getMenu...');
    try {
        const result = await aiService.getMenu();
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
