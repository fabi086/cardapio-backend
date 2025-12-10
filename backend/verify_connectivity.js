const axios = require('axios');

async function testEndpoint() {
    console.log('Testing connectivity to http://localhost:3002...');
    try {
        const res = await axios.get('http://localhost:3002/');
        console.log('✅ Base route accessible:', res.data);
    } catch (e) {
        console.error('❌ Base route failed:', e.message);
    }

    console.log('\nTesting notify-status endpoint (dry run)...');
    try {
        // Since we don't want to actually spam, we just check if it accepts the connection
        // We'll send valid but dummy data
        const res = await axios.post('http://localhost:3002/api/ai/notify-status', {
            phone: '5511999999999',
            status: 'pending',
            orderId: 1
        });
        console.log('✅ Endpoint accessible. Status:', res.status);
    } catch (e) {
        if (e.response) {
            console.log('✅ Endpoint reached but returned error (expected since mock data):', e.response.status);
        } else {
            console.error('❌ Endpoint unreachable:', e.message);
        }
    }
}

testEndpoint();
