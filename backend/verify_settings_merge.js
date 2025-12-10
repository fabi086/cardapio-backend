const aiService = require('./services/aiService');

async function testSettings() {
    await aiService.loadSettings();
    console.log('AI Settings loaded.');
    console.log('Admin WhatsApp:', aiService.settings.whatsapp);

    if (aiService.settings.whatsapp) {
        console.log('✅ Success: Admin phone loaded correctly.');
    } else {
        console.error('❌ Failure: Admin phone missing.');
    }
}

testSettings();
