const fetch = require('node-fetch');

async function test() {
    try {
        console.log('Fetching http://localhost:3002/api/marketing/customers?limit=10...');
        const res = await fetch('http://localhost:3002/api/marketing/customers?limit=10');
        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log('Data count:', Array.isArray(data) ? data.length : 'Not array');
            console.log('Data:', JSON.stringify(data, null, 2));
        } else {
            console.log('Error body:', await res.text());
        }
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

test();
