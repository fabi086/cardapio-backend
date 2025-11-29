const axios = require('axios');

const url = 'https://cardapio-backend-jztt.vercel.app/api/ai/webhook';

async function testWebhook() {
    try {
        console.log(`Sending test POST to ${url}...`);
        const response = await axios.post(url, {
            test: true,
            message: "Test from Antigravity"
        });
        console.log('Success! Status:', response.status);
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testWebhook();
