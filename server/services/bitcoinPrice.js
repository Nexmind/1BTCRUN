const axios = require('axios');
const db = require('../db/database');

/**
 * Fetches current Bitcoin price from CoinGecko API and stores in DB
 * @returns {Promise<number>} Current BTC price in USD
 */
async function fetchAndStoreBTCPrice() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin',
        vs_currencies: 'usd'
      }
    });

    const price = response.data.bitcoin.usd;
    const timestamp = new Date().toISOString();

    // Store in database
    db.prepare(`
      INSERT INTO btc_prices (price, timestamp)
      VALUES (?, ?)
    `).run(price, timestamp);

    console.log(`📊 BTC price updated: $${price.toLocaleString()} at ${timestamp}`);
    return price;
  } catch (error) {
    console.error('❌ Error fetching BTC price:', error.message);
    throw new Error('Failed to fetch Bitcoin price');
  }
}

/**
 * Gets the latest Bitcoin price from the database
 * Falls back to fetching from API if no recent price exists
 * @returns {Promise<{price: number, timestamp: string}>}
 */
async function getCurrentBTCPrice() {
  try {
    // Get latest price from database
    const latestPrice = db.prepare(`
      SELECT price, timestamp
      FROM btc_prices
      ORDER BY timestamp DESC
      LIMIT 1
    `).get();

    if (latestPrice) {
      const priceAge = Date.now() - new Date(latestPrice.timestamp).getTime();
      const oneHour = 60 * 60 * 1000;

      // If price is less than 1 hour old, use it
      if (priceAge < oneHour) {
        return {
          price: latestPrice.price,
          timestamp: latestPrice.timestamp
        };
      }
    }

    // If no recent price, fetch a new one
    console.log('⚠️  No recent price in DB, fetching from API...');
    const price = await fetchAndStoreBTCPrice();
    return {
      price,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error getting BTC price:', error.message);
    throw error;
  }
}

/**
 * Gets BTC price for withdrawals (always fetches fresh for accuracy)
 * @returns {Promise<number>}
 */
async function getBTCPriceForWithdrawal() {
  const price = await fetchAndStoreBTCPrice();
  return price;
}

module.exports = {
  getCurrentBTCPrice,
  fetchAndStoreBTCPrice,
  getBTCPriceForWithdrawal
};
