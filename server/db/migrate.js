const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'bitcoin-retire.db');
const db = new Database(dbPath);

console.log('🔄 Starting database migration...\n');

// Check if withdrawal_frequency column exists
try {
  const tableInfo = db.prepare("PRAGMA table_info(wallets)").all();
  const hasFrequencyColumn = tableInfo.some(col => col.name === 'withdrawal_frequency');

  if (!hasFrequencyColumn) {
    console.log('➕ Adding withdrawal_frequency column to wallets...');
    db.prepare('ALTER TABLE wallets ADD COLUMN withdrawal_frequency TEXT NOT NULL DEFAULT "monthly"').run();
    console.log('✅ Column added');
  } else {
    console.log('✓ withdrawal_frequency column already exists');
  }
} catch (error) {
  console.error('❌ Error migrating wallets table:', error.message);
}

// Check if current_week column exists in simulation_state
try {
  const tableInfo = db.prepare("PRAGMA table_info(simulation_state)").all();
  const hasWeekColumn = tableInfo.some(col => col.name === 'current_week');

  if (!hasWeekColumn) {
    console.log('➕ Adding current_week column to simulation_state...');
    db.prepare('ALTER TABLE simulation_state ADD COLUMN current_week INTEGER NOT NULL DEFAULT 0').run();
    console.log('✅ Column added');
  } else {
    console.log('✓ current_week column already exists');
  }
} catch (error) {
  console.error('❌ Error migrating simulation_state table:', error.message);
}

// Create weekly wallets if they don't exist
try {
  const weeklyCount = db.prepare("SELECT COUNT(*) as count FROM wallets WHERE withdrawal_frequency = 'weekly'").get();

  if (weeklyCount.count === 0) {
    console.log('\n➕ Creating 5 weekly wallets...');

    const insert = db.prepare(`
      INSERT INTO wallets (name, monthly_withdrawal, current_btc, start_date, status, withdrawal_frequency)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const startDate = new Date().toISOString().split('T')[0];

    const weeklyWallets = [
      { name: 'Good help (Weekly)', amount: 250, frequency: 'weekly' },
      { name: 'Boost life quality (Weekly)', amount: 500, frequency: 'weekly' },
      { name: 'Comfortable living (Weekly)', amount: 750, frequency: 'weekly' },
      { name: 'Premium lifestyle (Weekly)', amount: 1000, frequency: 'weekly' },
      { name: 'Luxury freedom (Weekly)', amount: 1250, frequency: 'weekly' }
    ];

    const insertMany = db.transaction((wallets) => {
      for (const wallet of wallets) {
        insert.run(wallet.name, wallet.amount, 1.0, startDate, 'active', wallet.frequency);
      }
    });

    insertMany(weeklyWallets);
    console.log('✅ 5 weekly wallets created');
  } else {
    console.log('✓ Weekly wallets already exist');
  }
} catch (error) {
  console.error('❌ Error creating weekly wallets:', error.message);
}

console.log('\n✨ Migration completed!\n');
db.close();
