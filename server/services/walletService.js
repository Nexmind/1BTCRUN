const db = require('../db/database');

/**
 * Get all wallets with their current status
 * @param {string} frequency - Optional filter by 'monthly' or 'weekly'
 */
function getAllWallets(frequency = null) {
  let query = `
    SELECT
      w.*,
      COUNT(t.id) as periods_elapsed,
      ROUND(w.current_btc, 8) as current_btc,
      (SELECT price FROM btc_prices ORDER BY timestamp ASC LIMIT 1) as initial_btc_price,
      (SELECT price FROM btc_prices ORDER BY timestamp DESC LIMIT 1) as current_btc_price
    FROM wallets w
    LEFT JOIN transactions t ON w.id = t.wallet_id
  `;

  const params = [];
  if (frequency) {
    query += ` WHERE w.withdrawal_frequency = ?`;
    params.push(frequency);
  }

  query += `
    GROUP BY w.id
    ORDER BY w.withdrawal_frequency, w.monthly_withdrawal ASC
  `;

  const wallets = db.prepare(query).all(...params);

  // Add calculated fields
  return wallets.map(wallet => {
    const usdEquivalent = wallet.current_btc * wallet.current_btc_price;

    // Calculate projection: how many periods until depletion
    let periodsUntilDepletion = null;
    if (wallet.current_btc > 0 && wallet.current_btc_price > 0) {
      const btcPerPeriod = wallet.monthly_withdrawal / wallet.current_btc_price;
      periodsUntilDepletion = Math.floor(wallet.current_btc / btcPerPeriod);
    }

    return {
      ...wallet,
      usd_equivalent: usdEquivalent,
      periods_until_depletion: periodsUntilDepletion
    };
  });
}

/**
 * Get wallet by ID
 */
function getWalletById(id) {
  return db.prepare('SELECT * FROM wallets WHERE id = ?').get(id);
}

/**
 * Get transaction history for a wallet
 */
function getWalletHistory(walletId) {
  return db.prepare(`
    SELECT
      date,
      btc_price,
      ROUND(btc_withdrawn, 8) as btc_withdrawn,
      ROUND(btc_remaining, 8) as btc_remaining,
      usd_withdrawn
    FROM transactions
    WHERE wallet_id = ?
    ORDER BY date ASC
  `).all(walletId);
}

/**
 * Process withdrawal for a wallet
 * @param {number} walletId - Wallet ID
 * @param {number} btcPrice - Current BTC price
 * @param {string} withdrawalDate - Date of withdrawal (YYYY-MM-DD)
 */
function processWithdrawal(walletId, btcPrice, withdrawalDate = null) {
  const wallet = getWalletById(walletId);

  if (!wallet) {
    throw new Error(`Wallet ${walletId} not found`);
  }

  if (wallet.status !== 'active') {
    console.log(`⏭️  Wallet "${wallet.name}" is ${wallet.status}, skipping...`);
    return null;
  }

  // Use provided date or current date
  const transactionDate = withdrawalDate || new Date().toISOString().split('T')[0];

  // Calculate BTC to withdraw
  const btcToWithdraw = wallet.monthly_withdrawal / btcPrice;
  const newBalance = wallet.current_btc - btcToWithdraw;

  // Check if wallet is depleted
  if (newBalance <= 0) {
    // Final withdrawal with remaining BTC
    const finalWithdrawal = wallet.current_btc;
    const finalUsd = finalWithdrawal * btcPrice;

    db.prepare(`
      INSERT INTO transactions (wallet_id, date, btc_price, btc_withdrawn, btc_remaining, usd_withdrawn)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      walletId,
      transactionDate,
      btcPrice,
      finalWithdrawal,
      0,
      finalUsd
    );

    db.prepare(`
      UPDATE wallets
      SET current_btc = 0, status = 'depleted'
      WHERE id = ?
    `).run(walletId);

    console.log(`💀 Wallet "${wallet.name}" is DEPLETED! Final withdrawal: ${finalWithdrawal.toFixed(8)} BTC ($${finalUsd.toFixed(2)})`);

    return {
      wallet: wallet.name,
      status: 'depleted',
      btcWithdrawn: finalWithdrawal,
      btcRemaining: 0,
      usdWithdrawn: finalUsd
    };
  }

  // Normal withdrawal
  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO transactions (wallet_id, date, btc_price, btc_withdrawn, btc_remaining, usd_withdrawn)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      walletId,
      transactionDate,
      btcPrice,
      btcToWithdraw,
      newBalance,
      wallet.monthly_withdrawal
    );

    db.prepare(`
      UPDATE wallets
      SET current_btc = ?
      WHERE id = ?
    `).run(newBalance, walletId);
  });

  transaction();

  console.log(`✅ Wallet "${wallet.name}": Withdrew ${btcToWithdraw.toFixed(8)} BTC ($${wallet.monthly_withdrawal}) | Remaining: ${newBalance.toFixed(8)} BTC`);

  return {
    wallet: wallet.name,
    status: 'active',
    btcWithdrawn: btcToWithdraw,
    btcRemaining: newBalance,
    usdWithdrawn: wallet.monthly_withdrawal
  };
}

/**
 * Process all active wallets
 * @param {number} btcPrice - Current BTC price
 * @param {string} withdrawalDate - Optional date for the withdrawal
 */
async function processAllWallets(btcPrice, withdrawalDate = null) {
  const wallets = getAllWallets();
  const results = [];

  for (const wallet of wallets) {
    const result = processWithdrawal(wallet.id, btcPrice, withdrawalDate);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

module.exports = {
  getAllWallets,
  getWalletById,
  getWalletHistory,
  processWithdrawal,
  processAllWallets
};
