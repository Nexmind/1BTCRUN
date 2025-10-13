const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'bitcoin-retire.db');

class DatabaseWrapper {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.ready = false;
    this.initPromise = this.initialize();
  }

  async initialize() {
    try {
      // Initialize sql.js
      this.SQL = await initSqlJs();

      // Load existing database or create new one
      if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        this.db = new this.SQL.Database(buffer);
      } else {
        this.db = new this.SQL.Database();
      }

      // Enable foreign keys
      this.db.run('PRAGMA foreign_keys = ON');

      // Create tables
      this.db.run(`
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

      // Save to disk
      this.saveToFile();

      // Initialize wallets if needed
      const result = this.db.exec('SELECT COUNT(*) as count FROM wallets');
      const count = result[0] ? result[0].values[0][0] : 0;

      if (count === 0) {
        this.initializeWallets();
      }

      // Initialize simulation state if needed
      const stateResult = this.db.exec('SELECT COUNT(*) as count FROM simulation_state');
      const stateCount = stateResult[0] ? stateResult[0].values[0][0] : 0;

      if (stateCount === 0) {
        this.db.run('INSERT INTO simulation_state (id, current_month, current_week) VALUES (1, 0, 0)');
        this.saveToFile();
        console.log('✅ Simulation state initialized');
      }

      this.ready = true;
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  initializeWallets() {
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

    this.db.run('BEGIN TRANSACTION');
    try {
      for (const wallet of allWallets) {
        this.db.run(
          `INSERT INTO wallets (name, monthly_withdrawal, current_btc, start_date, status, withdrawal_frequency)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [wallet.name, wallet.amount, 1.0, startDate, 'active', wallet.frequency]
        );
      }
      this.db.run('COMMIT');
      this.saveToFile();
      console.log('✅ 10 wallets initialized (5 monthly + 5 weekly) with 1 BTC each');
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  saveToFile() {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    }
  }

  ensureReady() {
    if (!this.ready) {
      throw new Error('Database not initialized. Call await db.initPromise first.');
    }
  }

  // Better-sqlite3 compatible API
  prepare(sql) {
    const self = this;
    return {
      run: (...params) => {
        self.ensureReady();
        try {
          self.db.run(sql, params);
          self.saveToFile();
          // Get last insert rowid
          const result = self.db.exec('SELECT last_insert_rowid() as id');
          const lastInsertRowid = result[0] ? result[0].values[0][0] : null;
          return {
            lastInsertRowid,
            changes: self.db.getRowsModified()
          };
        } catch (err) {
          console.error('Database run error:', err);
          throw err;
        }
      },

      get: (...params) => {
        self.ensureReady();
        try {
          const result = self.db.exec(sql, params);
          if (result.length === 0) return null;

          const columns = result[0].columns;
          const values = result[0].values[0];

          if (!values) return null;

          const row = {};
          columns.forEach((col, idx) => {
            row[col] = values[idx];
          });

          return row;
        } catch (err) {
          console.error('Database get error:', err);
          throw err;
        }
      },

      all: (...params) => {
        self.ensureReady();
        try {
          const result = self.db.exec(sql, params);
          if (result.length === 0) return [];

          const columns = result[0].columns;
          const values = result[0].values;

          return values.map(row => {
            const obj = {};
            columns.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          });
        } catch (err) {
          console.error('Database all error:', err);
          throw err;
        }
      },

      pluck: () => {
        return {
          get: (...params) => {
            self.ensureReady();
            try {
              const result = self.db.exec(sql, params);
              if (result.length === 0) return null;
              const values = result[0].values[0];
              return values ? values[0] : null;
            } catch (err) {
              console.error('Database pluck error:', err);
              throw err;
            }
          }
        };
      }
    };
  }

  exec(sql) {
    this.ensureReady();
    try {
      this.db.run(sql);
      this.saveToFile();
    } catch (err) {
      console.error('Database exec error:', err);
      throw err;
    }
  }

  pragma(sql) {
    this.ensureReady();
    try {
      this.db.run(sql);
    } catch (err) {
      console.error('Database pragma error:', err);
    }
  }

  transaction(fn) {
    return (data) => {
      this.ensureReady();
      this.db.run('BEGIN TRANSACTION');
      try {
        fn(data);
        this.db.run('COMMIT');
        this.saveToFile();
      } catch (err) {
        this.db.run('ROLLBACK');
        throw err;
      }
    };
  }

  close() {
    if (this.db) {
      this.saveToFile();
      this.db.close();
    }
  }
}

// Create and export database instance
const db = new DatabaseWrapper();

// Wait for initialization before exporting
db.initPromise.catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = db;