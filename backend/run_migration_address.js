require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Running migration to add address columns...');

    const sql = fs.readFileSync('update_schema_customers_address.sql', 'utf8');

    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

    for (const statement of statements) {
        try {
            const { data, error } = await supabase.rpc('exec', { sql: statement.trim() });
            if (error) {
                console.error('Error executing statement:', error);
                console.log('Statement:', statement);
            } else {
                console.log('✓ Statement executed successfully');
            }
        } catch (err) {
            console.error('Error:', err.message);
        }
    }

    console.log('Migration completed!');
}

runMigration();
