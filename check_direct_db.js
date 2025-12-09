
require('dotenv').config({ path: './backend/.env' }); // Adjust path if needed

try {
    require('pg');
    console.log('PG: Available');
} catch (e) {
    console.log('PG: Missing');
}

if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL: Present');
} else {
    console.log('DATABASE_URL: Missing');
}
