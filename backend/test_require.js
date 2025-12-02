try {
    console.log('Requiring aiService...');
    const aiService = require('./services/aiService');
    console.log('Success!');
} catch (error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
}
