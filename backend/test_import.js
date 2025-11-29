const fs = require('fs');
try {
    const aiService = require('./services/aiService');
    console.log('Successfully imported aiService');
} catch (error) {
    console.error('Error importing aiService');
    fs.writeFileSync('import_error.log', error.stack);
}
