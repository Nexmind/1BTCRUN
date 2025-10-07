const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'bitcoin-retire.db');

// Create an async/await friendly wrapper for sqlite3
class AsyncDatabase {
  constructor() {
    this.db = new sqlite3.Database(dbPath);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  serialize() {
    return new Promise((resolve) => {
      this.db.serialize(() => {
        resolve();
      });
    });
  }

  async initialize() {
    // Enable foreign keys
    await this.run('PRAGMA foreign_keys = ON');

    // Create tables
    await this.exec(`
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

    // Initialize wallets if needed
    const walletCount = await this.get('SELECT COUNT(*) as count FROM wallets');
    if (walletCount.count === 0) {
      await this.initializeWallets();
    }

    // Initialize simulation state if needed
    const stateCount = await this.get('SELECT COUNT(*) as count FROM simulation_state');
    if (stateCount.count === 0) {
      await this.run('INSERT INTO simulation_state (id, current_month, current_week) VALUES (1, 0, 0)');
      console.log('✅ Simulation state initialized');
    }
  }

  async initializeWallets() {
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

    await this.run('BEGIN TRANSACTION');

    for (const wallet of allWallets) {
      await this.run(
        `INSERT INTO wallets (name, monthly_withdrawal, current_btc, start_date, status, withdrawal_frequency)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [wallet.name, wallet.amount, 1.0, startDate, 'active', wallet.frequency]
      );
    }

    await this.run('COMMIT');
    console.log('✅ 10 wallets initialized (5 monthly + 5 weekly) with 1 BTC each');
  }
}

// For async/await operations
async function createAsyncDatabase() {
  const db = new AsyncDatabase();
  await db.initialize();
  return db;
}

module.exports = { AsyncDatabase, createAsyncDatabase };