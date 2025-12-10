try {
    const app = require('../backend/server');
    module.exports = app;
} catch (error) {
    console.error('FAILED TO LOAD BACKEND:', error);
    module.exports = (req, res) => {
        res.status(500).send(`
            <h1>Critical Error Loading Backend</h1>
            <pre>${error.stack || error.message}</pre>
            <p>Check Vercel logs for more details.</p>
        `);
    };
}
