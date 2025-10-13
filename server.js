const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./server/routes/api');
const { startCronJobs } = require('./server/jobs/withdrawalJobs');
const db = require('./server/db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start server after database is ready
db.initPromise.then(() => {
  app.listen(PORT, () => {
    console.log('\n🚀 Bitcoin Retire Server Started!');
    console.log(`📍 Server running on http://localhost:${PORT}`);
    console.log('🧡 Live long and hodl!\n');

    // Start cron jobs for monthly withdrawals and price updates
    startCronJobs();
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
