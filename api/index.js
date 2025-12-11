try {
    const app = require('../backend/server');
    module.exports = app;
} catch (error) {
    console.error('FAILED TO LOAD BACKEND:', error);
    module.exports = (req, res) => {
        // Enable CORS for the error response
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        res.status(500).json({
            error: 'Critical Error Loading Backend',
            details: error.message,
            stack: error.stack
        });
    };
}
