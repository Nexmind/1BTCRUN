const cron = require('node-cron');
const { getBTCPriceForWithdrawal, fetchAndStoreBTCPrice, getCurrentBTCPrice } = require('../services/bitcoinPrice');
const { processAllWallets } = require('../services/walletService');
const { getNextWithdrawalDate, incrementSimulationMonth, getCurrentSimulationMonth } = require('../services/simulationService');

/**
 * Manual trigger for testing purposes (simulates next month each time)
 * Uses cached price to avoid API rate limiting
 */
async function triggerMonthlyWithdrawal() {
  try {
    // Get the simulated withdrawal date
    const withdrawalDate = getNextWithdrawalDate();
    const currentMonth = getCurrentSimulationMonth();

    console.log('\n🚀 Starting monthly withdrawal process...');
    console.log(`📅 Simulation Month: ${currentMonth}`);
    console.log(`📅 Withdrawal Date: ${withdrawalDate}\n`);

    // Use cached price for testing to avoid API rate limiting
    const priceData = await getCurrentBTCPrice();
    const btcPrice = priceData.price;
    console.log(`💰 Using cached BTC price: $${btcPrice.toLocaleString()}`);

    const results = await processAllWallets(btcPrice, withdrawalDate);

    console.log('\n📊 Summary:');
    results.forEach(result => {
      const emoji = result.status === 'depleted' ? '💀' : '✅';
      console.log(`${emoji} ${result.wallet}: ${result.btcWithdrawn.toFixed(8)} BTC withdrawn | ${result.btcRemaining.toFixed(8)} BTC remaining`);
    });

    // Increment the simulation month for next time
    const newMonth = incrementSimulationMonth();
    console.log(`\n✨ Monthly withdrawal completed! Next withdrawal will be for month ${newMonth}\n`);

    return {
      results,
      withdrawalDate,
      simulationMonth: currentMonth
    };
  } catch (error) {
    console.error('❌ Error during monthly withdrawal:', error.message);
    throw error;
  }
}

/**
 * Real monthly withdrawal (for production cron job)
 * Uses actual current date, not simulation
 */
async function triggerRealMonthlyWithdrawal() {
  console.log('\n🚀 Starting REAL monthly withdrawal process...');
  console.log(`📅 Date: ${new Date().toISOString()}\n`);

  try {
    const btcPrice = await getBTCPriceForWithdrawal();
    const results = await processAllWallets(btcPrice);

    console.log('\n📊 Summary:');
    results.forEach(result => {
      const emoji = result.status === 'depleted' ? '💀' : '✅';
      console.log(`${emoji} ${result.wallet}: ${result.btcWithdrawn.toFixed(8)} BTC withdrawn | ${result.btcRemaining.toFixed(8)} BTC remaining`);
    });

    console.log('\n✨ Monthly withdrawal completed!\n');
    return results;
  } catch (error) {
    console.error('❌ Error during monthly withdrawal:', error.message);
    throw error;
  }
}

/**
 * Schedule cron jobs
 */
function startCronJobs() {
  // 1. Monthly withdrawal on the 1st of each month at midnight
  // Note: In production, you might want to use triggerRealMonthlyWithdrawal instead
  cron.schedule('0 0 1 * *', async () => {
    console.log('\n⏰ Scheduled monthly withdrawal triggered!');
    await triggerRealMonthlyWithdrawal();
  }, {
    timezone: "Europe/Paris"
  });

  // 2. Update BTC price every hour
  cron.schedule('0 * * * *', async () => {
    console.log('\n🔄 Hourly BTC price update...');
    try {
      await fetchAndStoreBTCPrice();
    } catch (error) {
      console.error('❌ Error updating BTC price:', error.message);
    }
  }, {
    timezone: "Europe/Paris"
  });

  console.log('⏰ Cron jobs scheduled:');
  console.log('  - Monthly withdrawal: 1st of each month at midnight (Europe/Paris)');
  console.log('  - BTC price update: Every hour');

  // Fetch initial price
  fetchAndStoreBTCPrice().catch(err => {
    console.error('❌ Failed to fetch initial BTC price:', err.message);
  });
}

module.exports = {
  startCronJobs,
  triggerMonthlyWithdrawal,
  triggerRealMonthlyWithdrawal
};
