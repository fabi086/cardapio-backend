
const aiService = require('./services/aiService');
require('dotenv').config();

async function testIncomingMock() {
    // aiService is exported as an instance: module.exports = new AIService();

    // Mock message from WhatsApp
    const mockMessage = {
        remoteJid: '5511999999999@s.whatsapp.net', // Needs full JID
        pushName: 'TestUser',
        conversation: 'olá cardápio', // Initial greeting
        messageType: 'conversation'
    };

    console.log('--- Simulating Incoming Message ---');
    try {
        await aiService.processMessage(mockMessage, 'whatsapp');
        console.log('--- Simulation Complete ---');
    } catch (error) {
        console.error('Simulation Failed:', error);
    }
}

testIncomingMock();
