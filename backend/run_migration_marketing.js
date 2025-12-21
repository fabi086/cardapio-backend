require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Running marketing migration...');

    try {
        const migrationPath = path.join(__dirname, '../migrations/create_marketing_tables.sql');
        console.log(`Reading migration file from: ${migrationPath}`);

        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolon and execute each statement
        // Note: This split is naive but works for simple schemas. 
        // Care needed with functions containing semicolons, but create_marketing_tables.sql is simple DDL.
        const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

        console.log(`Found ${statements.length} statements to execute.`);

        for (const statement of statements) {
            try {
                // Using the 'exec' RPC function required by the project's pattern
                const { error } = await supabase.rpc('exec', { sql: statement.trim() });

                if (error) {
                    console.error('Error executing statement:', error.message);
                    console.error('Statement was:', statement.substring(0, 100) + '...');
                    // Don't throw, try next. Some might already exist.
                } else {
                    console.log('✓ Executed successfully');
                }

                // Small delay to prevent rate limits
                await new Promise(r => setTimeout(r, 200));
            } catch (err) {
                console.error('Exception executing statement:', err.message);
            }
        }

        console.log('Migration process completed!');
    } catch (err) {
        console.error('Failed to read or parse migration file:', err);
    }
}

runMigration();
