require('dotenv').config();
console.log('EVOLUTION_API_KEY:', process.env.EVOLUTION_API_KEY ? 'Found' : 'Missing');
if (process.env.EVOLUTION_API_KEY) {
    console.log('Key length:', process.env.EVOLUTION_API_KEY.length);
    console.log('First 4 chars:', process.env.EVOLUTION_API_KEY.substring(0, 4));
}
