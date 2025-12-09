
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyKey() {
    console.log('1. Fetching API Key from DB...');
    const { data, error } = await supabase
        .from('ai_integration_settings')
        .select('openai_api_key')
        .single();

    if (error || !data || !data.openai_api_key) {
        console.error('❌ Failed to find API Key in DB:', error?.message);
        return;
    }

    const key = data.openai_api_key;
    console.log(`   Key found: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`);

    console.log('2. Testing Key with OpenAI API (Generation)...');
    try {
        const openai = new OpenAI({ apiKey: key });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Ping" }],
        });

        console.log('✅ Success! Model responded:', completion.choices[0].message.content);
    } catch (e) {
        console.error('❌ Generation Failed.');
        console.error('   Error:', e.message);
        console.error('   Code:', e.code);
        console.error('   Type:', e.type);

        if (e.code === 'insufficient_quota') {
            console.error('   CAUSE: You have run out of credits.');
        }
    }
}

verifyKey();
