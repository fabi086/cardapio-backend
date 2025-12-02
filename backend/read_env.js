const fs = require('fs');
try {
    const content = fs.readFileSync('.env', 'utf8');
    console.log('--- .env content ---');
    console.log(content);
    console.log('--------------------');
} catch (err) {
    console.error('Error reading .env:', err);
}
