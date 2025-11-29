require('dotenv').config();
const fs = require('fs');

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('result.txt', msg + '\n');
};

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

async function check() {
    log('Checking WRITE permission via REST API...');
    const url = `${supabaseUrl}/rest/v1/ai_integration_settings`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                instance_name: 'test_check_write',
                is_active: false
            })
        });

        log(`Status: ${response.status}`);
        log(`Status Text: ${response.statusText}`);

        if (!response.ok) {
            const text = await response.text();
            log(`Error body: ${text}`);
        } else {
            log('Success! Write permission granted.');
            // Cleanup
            const data = await response.json();
            if (data && data.length > 0) {
                const id = data[0].id;
                log(`Cleaning up test record: ${id}`);
                await fetch(`${url}?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
            }
        }
    } catch (err) {
        log(`Fetch error: ${err}`);
    }
}

check();
