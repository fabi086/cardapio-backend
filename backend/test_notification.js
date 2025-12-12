
const aiService = require('./services/aiService');

async function test() {
    console.log('Testing notification...');
    try {
        await aiService.sendNotification('11977966866', 'approved', 'TEST-ORDER-FABIO');
    } catch (e) {
        console.error('Test script error:', e);
    }
}

test();
