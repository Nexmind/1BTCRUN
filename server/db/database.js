const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'bitcoin-retire.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    monthly_withdrawal REAL NOT NULL,
    current_btc REAL NOT NULL DEFAULT 1.0,
    start_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    withdrawal_frequency TEXT NOT NULL DEFAULT 'monthly',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    btc_price REAL NOT NULL,
    btc_withdrawn REAL NOT NULL,
    btc_remaining REAL NOT NULL,
    usd_withdrawn REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

  CREATE TABLE IF NOT EXISTS btc_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    price REAL NOT NULL,
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_btc_prices_timestamp ON btc_prices(timestamp);

  CREATE TABLE IF NOT EXISTS simulation_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_month INTEGER NOT NULL DEFAULT 0,
    current_week INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Initialize wallets if they don't exist
const initializeWallets = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM wallets').get();

  if (count.count === 0) {
    const insert = db.prepare(`
      INSERT INTO wallets (name, monthly_withdrawal, current_btc, start_date, status, withdrawal_frequency)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Hardcoded start date: Wednesday October 8, 2025 at midnight
    const startDate = '2025-10-08';

    const monthlyWallets = [
      { name: 'Good help', amount: 1000, frequency: 'monthly' },
      { name: 'Boost life quality', amount: 2000, frequency: 'monthly' },
      { name: 'Comfortable living', amount: 3000, frequency: 'monthly' },
      { name: 'Premium lifestyle', amount: 4000, frequency: 'monthly' },
      { name: 'Luxury freedom', amount: 5000, frequency: 'monthly' }
    ];

    const weeklyWallets = [
      { name: 'Good help (Weekly)', amount: 250, frequency: 'weekly' },
      { name: 'Boost life quality (Weekly)', amount: 500, frequency: 'weekly' },
      { name: 'Comfortable living (Weekly)', amount: 750, frequency: 'weekly' },
      { name: 'Premium lifestyle (Weekly)', amount: 1000, frequency: 'weekly' },
      { name: 'Luxury freedom (Weekly)', amount: 1250, frequency: 'weekly' }
    ];

    const allWallets = [...monthlyWallets, ...weeklyWallets];

    const insertMany = db.transaction((wallets) => {
      for (const wallet of wallets) {
        insert.run(wallet.name, wallet.amount, 1.0, startDate, 'active', wallet.frequency);
      }
    });

    insertMany(allWallets);
    console.log('✅ 10 wallets initialized (5 monthly + 5 weekly) with 1 BTC each');
  }
};

// Initialize simulation state
const initializeSimulationState = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM simulation_state').get();

  if (count.count === 0) {
    db.prepare('INSERT INTO simulation_state (id, current_month, current_week) VALUES (1, 0, 0)').run();
    console.log('✅ Simulation state initialized');
  }
};

initializeWallets();
initializeSimulationState();

module.exports = db;