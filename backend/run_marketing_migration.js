const path = require('path');
const envPath = path.join(__dirname, '.env');
console.log('Loading env from:', envPath);
require('dotenv').config({ path: envPath });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('SUPABASE_KEY:', supabaseKey ? 'Found' : 'Missing');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');
console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? 'Found' : 'Missing');



if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE env vars');
}

if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL found, proceeding with PG client...');
    const { Client } = require('pg');
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    (async () => {
        try {
            await client.connect();
            console.log('Connected to PG!');
            const sql = fs.readFileSync(path.join(__dirname, '../migrations/create_marketing_tables.sql'), 'utf8');
            await client.query(sql);
            console.log('Migration successful via PG');
            process.exit(0);
        } catch (e) {
            console.error('PG Error:', e);
            process.exit(1);
        } finally {
            await client.end();
        }
    })();

} else {
    console.log('DATABASE_URL MISSING. Cannot run via PG.');
    // Check if we can run via RPC (but we know it failed)
    // exit
    process.exit(1);
}
