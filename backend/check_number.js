
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNumber() {
    console.log('Fetching Settings...');
    const { data, error } = await supabase
        .from('ai_integration_settings')
        .select('*')
        .single();

    if (!data) return;

    const phones = ['5511940321396', '551140321396']; // Try with and without 9

    for (const phone of phones) {
        console.log(`Checking phone: ${phone}...`);
        try {
            // Usually /chat/checkNumberStatus/{instance}/{number}
            const url = `${data.evolution_api_url}/chat/checkNumberStatus/${data.instance_name}/${phone}`;
            console.log(`URL: ${url}`);
            const res = await axios.get(url, {
                headers: { 'apikey': data.evolution_api_key }
            });
            console.log('Result:', JSON.stringify(res.data, null, 2));
        } catch (e) {
            console.error(`Error checking ${phone}:`, e.message);
            if (e.response) {
                console.error('Response:', JSON.stringify(e.response.data, null, 2));
            }
        }
        console.log('---');
    }
}

checkNumber();
