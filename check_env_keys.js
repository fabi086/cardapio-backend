
require('dotenv').config({ path: './backend/.env' });

const keys = Object.keys(process.env);
console.log('Env keys found:', keys.filter(k => !k.startsWith('npm_') && !k.startsWith('Program')));

if (process.env.DATABASE_URL) console.log('DATABASE_URL is present');
else console.log('DATABASE_URL is MISSING');

if (process.env.SUPABASE_DB_URL) console.log('SUPABASE_DB_URL is present');
