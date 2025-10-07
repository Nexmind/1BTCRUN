const db = require('../db/database');

/**
 * Get current simulation state
 */
function getSimulationState() {
  const state = db.prepare('SELECT current_month, current_week FROM simulation_state WHERE id = 1').get();
  return state || { current_month: 0, current_week: 0 };
}

/**
 * Get current simulation month
 */
function getCurrentSimulationMonth() {
  const state = getSimulationState();
  return state.current_month;
}

/**
 * Get current simulation week
 */
function getCurrentSimulationWeek() {
  const state = getSimulationState();
  return state.current_week;
}

/**
 * Increment simulation month and return new value
 */
function incrementSimulationMonth() {
  db.prepare(`
    UPDATE simulation_state
    SET current_month = current_month + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run();

  return getCurrentSimulationMonth();
}

/**
 * Increment simulation week and return new value
 */
function incrementSimulationWeek() {
  db.prepare(`
    UPDATE simulation_state
    SET current_week = current_week + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run();

  return getCurrentSimulationWeek();
}

/**
 * Get simulated date based on offset
 * @param {string} startDate - The starting date (YYYY-MM-DD)
 * @param {number} offset - Number of periods to add
 * @param {string} type - 'month' or 'week'
 */
function getSimulatedDate(startDate, offset, type = 'month') {
  const date = new Date(startDate);

  if (type === 'month') {
    date.setMonth(date.getMonth() + offset);
  } else if (type === 'week') {
    date.setDate(date.getDate() + (offset * 7));
  }

  return date.toISOString().split('T')[0];
}

/**
 * Calculate the withdrawal date for monthly wallets
 */
function getNextMonthlyWithdrawalDate() {
  const wallets = db.prepare('SELECT start_date FROM wallets LIMIT 1').get();

  if (!wallets) {
    return new Date().toISOString().split('T')[0];
  }

  const currentMonth = getCurrentSimulationMonth();
  return getSimulatedDate(wallets.start_date, currentMonth, 'month');
}

/**
 * Calculate the withdrawal date for weekly wallets
 */
function getNextWeeklyWithdrawalDate() {
  const wallets = db.prepare('SELECT start_date FROM wallets LIMIT 1').get();

  if (!wallets) {
    return new Date().toISOString().split('T')[0];
  }

  const currentWeek = getCurrentSimulationWeek();
  return getSimulatedDate(wallets.start_date, currentWeek, 'week');
}

/**
 * Reset simulation to 0
 */
function resetSimulation() {
  db.prepare('UPDATE simulation_state SET current_month = 0, current_week = 0, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run();
  console.log('🔄 Simulation reset to 0');
}

module.exports = {
  getSimulationState,
  getCurrentSimulationMonth,
  getCurrentSimulationWeek,
  incrementSimulationMonth,
  incrementSimulationWeek,
  getSimulatedDate,
  getNextMonthlyWithdrawalDate,
  getNextWeeklyWithdrawalDate,
  resetSimulation
};
