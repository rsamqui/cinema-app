const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const routesDir = path.join(__dirname, 'routes');

// Auto-import all routes from the /routes directory
fs.readdirSync(routesDir).forEach((file) => {
    if (file.endsWith('.js')) {
        const route = require(path.join(routesDir, file));
        app.use('/api', route);
    }
});

module.exports = app;
