const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'bitcoin-retire.db');

console.log('🗑️  Resetting database...');
console.log(`📁 DB Path: ${dbPath}`);

// Delete the database file if it exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Old database deleted');
} else {
  console.log('ℹ️  No existing database found at this location');
}

// Recreate the database
console.log('🔨 Creating fresh database...');

// Clear the require cache to force database.js to recreate
delete require.cache[require.resolve('./database')];
require('./database');

console.log('✅ Database reset complete!');
console.log('');
console.log('Database now has:');
console.log('  - 5 monthly wallets (1 BTC each)');
console.log('  - 5 weekly wallets (1 BTC each)');
console.log('  - Fresh BTC price data');
console.log('  - Simulation counters reset to 0');
console.log('');
console.log('Ready to start! 🚀');

process.exit(0);
