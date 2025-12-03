try {
    console.log('Attempting to require api/index.js...');
    const app = require('./api/index.js');
    console.log('Successfully required api/index.js');
    console.log('Type of exported module:', typeof app);
    if (typeof app === 'function') {
        console.log('Export is a function (expected for Express app)');
    } else {
        console.error('Export is NOT a function!');
        process.exit(1);
    }
} catch (error) {
    console.error('FAILED to require api/index.js');
    console.error('Error Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
