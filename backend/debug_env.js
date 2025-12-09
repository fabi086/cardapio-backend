const result = require('dotenv').config({ path: './.env', debug: true });

if (result.error) {
    console.log('Error loading .env:', result.error);
} else {
    console.log('Parsed keys:', Object.keys(result.parsed));
}

console.log('EVOLUTION_API_KEY:', process.env.EVOLUTION_API_KEY ? 'FOUND' : 'MISSING');
