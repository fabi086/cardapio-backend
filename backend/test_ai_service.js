const aiService = require('./services/aiService');

async function test() {
    console.log('Testing AI Service...');
    try {
        const response = await aiService.processMessage({
            remoteJid: '5511999999999@s.whatsapp.net',
            pushName: 'Test User',
            conversation: 'oi',
            text: { message: 'oi' }
        });
        console.log('Response:', response);
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
