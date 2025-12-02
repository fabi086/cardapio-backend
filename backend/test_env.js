require('dotenv').config();
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Found' : 'Missing');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Found' : 'Missing');
