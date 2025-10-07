const express = require('express');
const router = express.Router();
const { getCurrentBTCPrice } = require('../services/bitcoinPrice');
const { getAllWallets, getWalletHistory } = require('../services/walletService');
const { triggerMonthlyWithdrawal, triggerWeeklyWithdrawal } = require('../jobs/withdrawalJobs');
const { getSimulationState } = require('../services/simulationService');

/**
 * GET /api/wallets
 * Get all wallets with current status
 * Query params: ?frequency=monthly|weekly
 */
router.get('/wallets', (req, res) => {
  try {
    const frequency = req.query.frequency || null;
    const wallets = getAllWallets(frequency);
    res.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/wallets/:id/history
 * Get transaction history for a specific wallet
 */
router.get('/wallets/:id/history', (req, res) => {
  try {
    const walletId = parseInt(req.params.id);
    const history = getWalletHistory(walletId);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/btc-price
 * Get current Bitcoin price (from cache)
 */
router.get('/btc-price', async (req, res) => {
  try {
    const priceData = await getCurrentBTCPrice();
    res.json({
      success: true,
      data: priceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trigger-withdrawal
 * Manually trigger withdrawal (for testing)
 * Body: { frequency: 'monthly' | 'weekly' }
 */
router.post('/trigger-withdrawal', async (req, res) => {
  try {
    const frequency = req.body.frequency || 'monthly';

    let result;
    if (frequency === 'weekly') {
      result = await triggerWeeklyWithdrawal();
    } else {
      result = await triggerMonthlyWithdrawal();
    }

    res.json({
      success: true,
      message: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} withdrawal completed`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/simulation-status
 * Get current simulation status
 */
router.get('/simulation-status', (req, res) => {
  try {
    const state = getSimulationState();
    res.json({
      success: true,
      data: state
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
