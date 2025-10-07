const cron = require('node-cron');
const { getBTCPriceForWithdrawal, fetchAndStoreBTCPrice, getCurrentBTCPrice } = require('../services/bitcoinPrice');
const { getAllWallets } = require('../services/walletService');
const {
  getNextMonthlyWithdrawalDate,
  getNextWeeklyWithdrawalDate,
  incrementSimulationMonth,
  incrementSimulationWeek,
  getCurrentSimulationMonth,
  getCurrentSimulationWeek
} = require('../services/simulationService');

/**
 * Process wallets by frequency
 */
async function processWalletsByFrequency(frequency, btcPrice, withdrawalDate) {
  const db = require('../db/database');
  const wallets = getAllWallets(frequency);
  const results = [];

  for (const wallet of wallets) {
    if (wallet.status !== 'active') {
      console.log(`⏭️  Wallet "${wallet.name}" is ${wallet.status}, skipping...`);
      continue;
    }

    // Calculate BTC to withdraw
    const btcToWithdraw = wallet.monthly_withdrawal / btcPrice;
    const newBalance = wallet.current_btc - btcToWithdraw;

    // Check if wallet is depleted
    if (newBalance <= 0) {
      const finalWithdrawal = wallet.current_btc;
      const finalUsd = finalWithdrawal * btcPrice;

      db.prepare(`
        INSERT INTO transactions (wallet_id, date, btc_price, btc_withdrawn, btc_remaining, usd_withdrawn)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(wallet.id, withdrawalDate, btcPrice, finalWithdrawal, 0, finalUsd);

      db.prepare(`UPDATE wallets SET current_btc = 0, status = 'depleted' WHERE id = ?`).run(wallet.id);

      console.log(`💀 ${wallet.name} DEPLETED!`);
      results.push({ wallet: wallet.name, status: 'depleted', btcWithdrawn: finalWithdrawal, btcRemaining: 0 });
    } else {
      // Normal withdrawal
      const transaction = db.transaction(() => {
        db.prepare(`
          INSERT INTO transactions (wallet_id, date, btc_price, btc_withdrawn, btc_remaining, usd_withdrawn)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(wallet.id, withdrawalDate, btcPrice, btcToWithdraw, newBalance, wallet.monthly_withdrawal);

        db.prepare(`UPDATE wallets SET current_btc = ? WHERE id = ?`).run(newBalance, wallet.id);
      });

      transaction();

      console.log(`✅ ${wallet.name}: -${btcToWithdraw.toFixed(8)} BTC | Remaining: ${newBalance.toFixed(8)} BTC`);
      results.push({ wallet: wallet.name, status: 'active', btcWithdrawn: btcToWithdraw, btcRemaining: newBalance });
    }
  }

  return results;
}

/**
 * Trigger monthly withdrawal (for simulation)
 */
async function triggerMonthlyWithdrawal() {
  try {
    const withdrawalDate = getNextMonthlyWithdrawalDate();
    const currentMonth = getCurrentSimulationMonth();

    console.log('\n🗓️  Starting MONTHLY withdrawal...');
    console.log(`📅 Month: ${currentMonth} | Date: ${withdrawalDate}`);

    const priceData = await getCurrentBTCPrice();
    const btcPrice = priceData.price;

    const results = await processWalletsByFrequency('monthly', btcPrice, withdrawalDate);

    const newMonth = incrementSimulationMonth();
    console.log(`\n✨ Monthly withdrawal done! Next: month ${newMonth}\n`);

    return { results, withdrawalDate, simulationPeriod: currentMonth, frequency: 'monthly' };
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * Trigger weekly withdrawal (for simulation)
 */
async function triggerWeeklyWithdrawal() {
  try {
    const withdrawalDate = getNextWeeklyWithdrawalDate();
    const currentWeek = getCurrentSimulationWeek();

    console.log('\n📅 Starting WEEKLY withdrawal...');
    console.log(`📅 Week: ${currentWeek} | Date: ${withdrawalDate}`);

    const priceData = await getCurrentBTCPrice();
    const btcPrice = priceData.price;

    const results = await processWalletsByFrequency('weekly', btcPrice, withdrawalDate);

    const newWeek = incrementSimulationWeek();
    console.log(`\n✨ Weekly withdrawal done! Next: week ${newWeek}\n`);

    return { results, withdrawalDate, simulationPeriod: currentWeek, frequency: 'weekly' };
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * Real monthly withdrawal (production cron)
 */
async function triggerRealMonthlyWithdrawal() {
  console.log('\n🚀 REAL monthly withdrawal (production)...');
  const btcPrice = await getBTCPriceForWithdrawal();
  const results = await processWalletsByFrequency('monthly', btcPrice, new Date().toISOString().split('T')[0]);
  console.log('\n✨ Done!\n');
  return results;
}

/**
 * Real weekly withdrawal (production cron)
 */
async function triggerRealWeeklyWithdrawal() {
  console.log('\n🚀 REAL weekly withdrawal (production)...');
  const btcPrice = await getBTCPriceForWithdrawal();
  const results = await processWalletsByFrequency('weekly', btcPrice, new Date().toISOString().split('T')[0]);
  console.log('\n✨ Done!\n');
  return results;
}

/**
 * Start cron jobs
 */
function startCronJobs() {
  // Monthly: Every 8th of the month at midnight UTC
  cron.schedule('0 0 8 * *', async () => {
    console.log('\n⏰ Scheduled MONTHLY withdrawal (8th at midnight UTC)!');
    await triggerMonthlyWithdrawal();
  });

  // Weekly: Every Wednesday at midnight UTC
  cron.schedule('0 0 * * 3', async () => {
    console.log('\n⏰ Scheduled WEEKLY withdrawal (Wednesday at midnight UTC)!');
    await triggerWeeklyWithdrawal();
  });

  // BTC price update: Every hour
  cron.schedule('0 * * * *', async () => {
    console.log('\n🔄 Hourly BTC price update...');
    try {
      await fetchAndStoreBTCPrice();
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  });

  console.log('⏰ Production cron jobs scheduled (UTC):');
  console.log('  - Monthly withdrawal: 8th of month at midnight UTC');
  console.log('  - Weekly withdrawal: Every Wednesday at midnight UTC');
  console.log('  - BTC price update: Every hour');
  console.log('');

  fetchAndStoreBTCPrice().catch(err => console.error('❌ Initial price fetch failed:', err.message));
}

module.exports = {
  startCronJobs,
  triggerMonthlyWithdrawal,
  triggerWeeklyWithdrawal,
  triggerRealMonthlyWithdrawal,
  triggerRealWeeklyWithdrawal
};
