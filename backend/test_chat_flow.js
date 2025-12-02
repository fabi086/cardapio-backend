require('dotenv').config();
const aiService = require('./services/aiService');

async function testFlow() {
    console.log('1. Testing AI Service...');

    // Simulate web chat message
    const messageData = {
        remoteJid: 'web_123456@s.whatsapp.net',
        pushName: 'Web User',
        conversation: 'Olá, quero fazer um pedido'
    };

    try {
        const response = await aiService.processMessage(messageData, 'web');
        console.log('Response:', response);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
    }
}

testFlow();
