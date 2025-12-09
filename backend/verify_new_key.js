const axios = require('axios');

const url = 'https://api.fbmidias.site';
const key = '8296D4AC1556-491F-8B46-6CEB865FE8E6';

async function check() {
    try {
        console.log('Checking fetchInstances with NEW KEY...');
        const res = await axios.get(`${url}/instance/fetchInstances`, {
            headers: { 'apikey': key }
        });
        console.log('✅ Connection Successful!');
        console.log('Instances:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('❌ Connection Failed:', e.message);
        if (e.response) console.log('Response:', e.response.status, e.response.data);
    }
}

check();
