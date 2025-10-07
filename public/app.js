// Global state
let walletsData = [];
let chartInstance = null;
let currentFrequency = 'monthly';

// API Base URL
const API_BASE = '/api';

// Sanitize HTML to prevent XSS
function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupTabs();
  setupChartFilters();
  loadBTCPrice();
  loadWallets(currentFrequency);
  setupModal();
  setupDonationButton();
  startCountdown();

  // Refresh data every 5 minutes
  setInterval(() => {
    loadBTCPrice();
    loadWallets(currentFrequency);
  }, 5 * 60 * 1000);

  // Update countdown every second
  setInterval(startCountdown, 1000);
});

// Theme Management
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme') || 'light';

  // Apply saved theme
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  // Toggle theme on click
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    // Update chart colors if chart exists
    if (chartInstance) {
      updateChartTheme(newTheme);
    }
  });
}

function updateThemeIcon(theme) {
  const themeToggle = document.getElementById('themeToggle');
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function updateChartTheme(theme) {
  if (!chartInstance) return;

  const textColor = theme === 'dark' ? '#f5f5f5' : '#1a1a1a';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  chartInstance.options.plugins.legend.labels.color = textColor;
  chartInstance.options.scales.x.title.color = textColor;
  chartInstance.options.scales.x.ticks.color = textColor;
  chartInstance.options.scales.x.grid.color = gridColor;
  chartInstance.options.scales.y.title.color = textColor;
  chartInstance.options.scales.y.ticks.color = textColor;
  chartInstance.options.scales.y.grid.color = gridColor;

  chartInstance.update();
}

// Setup tabs
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update current frequency and reload
      currentFrequency = btn.dataset.frequency;
      loadWallets(currentFrequency);
    });
  });
}

// Setup chart filters
function setupChartFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter chart
      const filter = btn.dataset.filter;
      filterChart(filter);
    });
  });
}

// Filter chart datasets
function filterChart(filter) {
  if (!chartInstance) return;

  chartInstance.data.datasets.forEach((dataset, index) => {
    const meta = chartInstance.getDatasetMeta(index);

    if (filter === 'all') {
      meta.hidden = false;
    } else if (filter === 'monthly') {
      meta.hidden = dataset.frequency !== 'monthly';
    } else if (filter === 'weekly') {
      meta.hidden = dataset.frequency !== 'weekly';
    }
  });

  chartInstance.update();
}

// Countdown to next real withdrawal
function startCountdown() {
  const now = new Date();

  // Simple UTC-based calculation
  function getNextWithdrawalDate(isMonthly) {
    const currentUTC = new Date(now.toISOString());
    let targetDate = new Date(currentUTC);

    if (isMonthly) {
      // Monthly: 7th of month at 18:00 UTC
      targetDate.setUTCDate(7);
      targetDate.setUTCHours(18, 0, 0, 0);

      // If we've passed the 7th at 18:00 UTC this month, go to next month
      if (targetDate <= now) {
        targetDate.setUTCMonth(targetDate.getUTCMonth() + 1);
      }
    } else {
      // Weekly: Tuesday (day 2) at 18:00 UTC
      const currentDay = currentUTC.getUTCDay();
      let daysUntilTuesday = (2 - currentDay + 7) % 7;

      // If it's Tuesday but past 18:00 UTC, go to next Tuesday
      if (daysUntilTuesday === 0) {
        if (currentUTC.getUTCHours() >= 18) {
          daysUntilTuesday = 7;
        }
      }

      targetDate.setUTCDate(currentUTC.getUTCDate() + daysUntilTuesday);
      targetDate.setUTCHours(18, 0, 0, 0);
    }

    return targetDate;
  }

  // Next monthly withdrawal: 7th of month at 18:00 UTC
  const nextMonthly = getNextWithdrawalDate(true);
  const monthlyDiff = nextMonthly - now;

  // Next weekly withdrawal: Tuesday at 18:00 UTC
  const nextTuesday = getNextWithdrawalDate(false);
  const weeklyDiff = nextTuesday - now;

  // Update labels with local time
  const monthlyLabel = document.getElementById('monthlyLabel');
  const weeklyLabel = document.getElementById('weeklyLabel');

  if (monthlyLabel) {
    const localTime = nextMonthly.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    monthlyLabel.textContent = `Monthly (7th at ${localTime})`;
  }

  if (weeklyLabel) {
    const localTime = nextTuesday.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    weeklyLabel.textContent = `Weekly (Tuesday at ${localTime})`;
  }

  // Update monthly countdown
  const monthlyEl = document.getElementById('countdownMonthly');
  if (monthlyEl) {
    if (monthlyDiff <= 0) {
      monthlyEl.textContent = 'Processing...';
    } else {
      const days = Math.floor(monthlyDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((monthlyDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((monthlyDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((monthlyDiff % (1000 * 60)) / 1000);
      monthlyEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
  }

  // Update weekly countdown
  const weeklyEl = document.getElementById('countdownWeekly');
  if (weeklyEl) {
    if (weeklyDiff <= 0) {
      weeklyEl.textContent = 'Processing...';
    } else {
      const days = Math.floor(weeklyDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((weeklyDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((weeklyDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((weeklyDiff % (1000 * 60)) / 1000);
      weeklyEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
  }
}

// Fetch and display BTC price
async function loadBTCPrice() {
  try {
    const response = await fetch(`${API_BASE}/btc-price`);
    const result = await response.json();

    if (result.success) {
      const priceElement = document.getElementById('btcPrice');
      const updatedElement = document.getElementById('lastUpdated');

      priceElement.textContent = `$${result.data.price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;

      const timestamp = new Date(result.data.timestamp);
      updatedElement.textContent = `Updated: ${timestamp.toLocaleString()}`;
    }
  } catch (error) {
    console.error('Error loading BTC price:', error);
    document.getElementById('btcPrice').textContent = 'Error loading price';
  }
}

// Fetch and display wallets
async function loadWallets(frequency = 'monthly') {
  try {
    const response = await fetch(`${API_BASE}/wallets?frequency=${frequency}`);
    const result = await response.json();

    if (result.success) {
      walletsData = result.data;
      renderWallets(walletsData);
      await loadChartData();
    }
  } catch (error) {
    console.error('Error loading wallets:', error);
  }
}

// Render wallet cards
function renderWallets(wallets) {
  const grid = document.getElementById('walletsGrid');
  grid.innerHTML = '';

  wallets.forEach(wallet => {
    const card = createWalletCard(wallet);
    grid.appendChild(card);
  });
}

// Create a single wallet card
function createWalletCard(wallet) {
  const card = document.createElement('div');
  card.className = `wallet-card ${wallet.status}`;

  const statusClass = wallet.status === 'active' ? 'active' : 'depleted';
  const statusText = wallet.status === 'active' ? '✅ Active' : '💀 Depleted';
  const btcDisplay = wallet.current_btc.toFixed(8);
  const percentageRemaining = ((wallet.current_btc / 1.0) * 100).toFixed(1);

  // Determine frequency label
  const isWeekly = wallet.withdrawal_frequency === 'weekly';
  const frequencyLabel = isWeekly ? 'week' : 'month';
  const periodsElapsed = wallet.periods_elapsed || 0;
  const periodsLabel = isWeekly ? 'Weeks Elapsed' : 'Months Elapsed';

  // Initial BTC price
  const initialPrice = wallet.initial_btc_price;
  const initialPriceDisplay = initialPrice
    ? `$${initialPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : 'N/A';

  // USD equivalent
  const usdEquivalent = wallet.usd_equivalent || 0;
  const usdDisplay = `$${usdEquivalent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Projection
  const periodsUntilDepletion = wallet.periods_until_depletion;
  const projectionDisplay = periodsUntilDepletion !== null && periodsUntilDepletion > 0
    ? `~${periodsUntilDepletion} ${isWeekly ? 'weeks' : 'months'}`
    : wallet.status === 'depleted' ? 'Depleted' : 'N/A';

  // Calculate circle progress (SVG)
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentageRemaining / 100) * circumference;

  card.innerHTML = `
    <div class="wallet-header">
      <h3 class="wallet-name">${sanitizeHTML(wallet.name)}</h3>
      <div class="wallet-monthly">$${wallet.monthly_withdrawal.toLocaleString()}/${frequencyLabel}</div>
    </div>

    <div class="wallet-body">
      <div class="circular-progress">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="${radius}" class="progress-bg" />
          <circle cx="60" cy="60" r="${radius}" class="progress-bar ${statusClass}"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${offset}" />
        </svg>
        <div class="progress-text">${percentageRemaining}%</div>
      </div>

      <div class="wallet-stats">
        <div class="stat-item">
          <span class="stat-label">BTC Balance</span>
          <span class="stat-value highlight ${wallet.status}">${btcDisplay} ₿</span>
        </div>

        <div class="stat-item">
          <span class="stat-label">USD Value</span>
          <span class="stat-value">${usdDisplay}</span>
        </div>

        <div class="stat-item">
          <span class="stat-label">
            Time Until Depletion
            <span class="info-icon" title="Estimated based on current BTC price">ⓘ</span>
          </span>
          <span class="stat-value projection">${projectionDisplay}</span>
        </div>

        <div class="stat-item">
          <span class="stat-label">${periodsLabel}</span>
          <span class="stat-value">${periodsElapsed}</span>
        </div>

        <div class="stat-item">
          <span class="stat-label">Purchase Price</span>
          <span class="stat-value">${initialPriceDisplay}</span>
        </div>
      </div>
    </div>

    <div class="wallet-status ${statusClass}">
      ${statusText}
    </div>
  `;

  // Add click handler to show transaction details
  card.addEventListener('click', () => {
    showTransactionModal(wallet);
  });

  return card;
}

// Load and render chart - now loads ALL wallets
async function loadChartData() {
  try {
    // Fetch ALL wallets (both monthly and weekly)
    const [monthlyResponse, weeklyResponse] = await Promise.all([
      fetch(`${API_BASE}/wallets?frequency=monthly`).then(res => res.json()),
      fetch(`${API_BASE}/wallets?frequency=weekly`).then(res => res.json())
    ]);

    const allWallets = [
      ...monthlyResponse.data,
      ...weeklyResponse.data
    ];

    // Fetch history for all wallets
    const historyPromises = allWallets.map(wallet =>
      fetch(`${API_BASE}/wallets/${wallet.id}/history`).then(res => res.json())
    );

    const histories = await Promise.all(historyPromises);

    // Color palettes - Monthly: vibrant, Weekly: pastel
    const monthlyColors = [
      '#4CAF50', // Green
      '#2196F3', // Blue
      '#FF9800', // Orange
      '#9C27B0', // Purple
      '#f44336'  // Red
    ];

    const weeklyColors = [
      '#A5D6A7', // Pastel Green
      '#90CAF9', // Pastel Blue
      '#FFCC80', // Pastel Orange
      '#CE93D8', // Pastel Purple
      '#EF9A9A'  // Pastel Red
    ];

    // Prepare data for Chart.js - normalized by period number
    const datasets = allWallets.map((wallet, index) => {
      const history = histories[index].data;
      const isWeekly = wallet.withdrawal_frequency === 'weekly';

      // Add initial point (period 0 = 1 BTC)
      const data = [{ x: 0, y: 1.0 }];

      // Add historical data with normalized periods
      history.forEach((transaction, txIndex) => {
        // For weekly: period = week number
        // For monthly: period = month number * 4 (to normalize with weekly)
        const periodNumber = isWeekly ? (txIndex + 1) : (txIndex + 1) * 4;
        data.push({
          x: periodNumber,
          y: transaction.btc_remaining
        });
      });

      // Select color based on frequency
      const colors = isWeekly ? weeklyColors : monthlyColors;
      const colorIndex = index % 5;

      return {
        label: `${wallet.name} ($${wallet.monthly_withdrawal}/${isWeekly ? 'wk' : 'mo'})`,
        data: data,
        borderColor: colors[colorIndex],
        backgroundColor: colors[colorIndex] + '20',
        borderWidth: 2,
        tension: 0.1,
        fill: false,
        hidden: false,
        frequency: wallet.withdrawal_frequency // Add frequency for filtering
      };
    });

    renderChart(datasets);
  } catch (error) {
    console.error('Error loading chart data:', error);
  }
}

// Render Chart.js chart
function renderChart(datasets) {
  const ctx = document.getElementById('comparisonChart').getContext('2d');

  // Destroy existing chart if it exists
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Get current theme colors
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const textColor = currentTheme === 'dark' ? '#f5f5f5' : '#1a1a1a';
  const gridColor = currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: textColor,
            font: { size: 12 },
            padding: 15
          },
          onClick: function(e, legendItem, legend) {
            const index = legendItem.datasetIndex;
            const ci = legend.chart;
            const meta = ci.getDatasetMeta(index);

            // Toggle visibility
            meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
            ci.update();
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(8)} BTC`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Weeks Elapsed',
            color: textColor
          },
          ticks: {
            color: textColor,
            callback: function(value) {
              return 'W' + value;
            }
          },
          grid: { color: gridColor }
        },
        y: {
          title: {
            display: true,
            text: 'BTC Remaining',
            color: textColor
          },
          ticks: {
            color: textColor,
            callback: function(value) {
              return value.toFixed(4) + ' ₿';
            }
          },
          grid: { color: gridColor },
          beginAtZero: true
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

// Setup modal
function setupModal() {
  const modal = document.getElementById('transactionModal');
  const closeBtn = document.getElementById('closeModal');

  // Close modal on X click
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
  });

  // Close modal on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      modal.classList.remove('show');
    }
  });
}

// Show transaction modal for a wallet
async function showTransactionModal(wallet) {
  try {
    const response = await fetch(`${API_BASE}/wallets/${wallet.id}/history`);
    const result = await response.json();

    if (!result.success) {
      alert('Error loading transaction history');
      return;
    }

    const transactions = result.data;
    const modal = document.getElementById('transactionModal');
    const modalTitle = document.getElementById('modalTitle');
    const transactionList = document.getElementById('transactionList');

    modalTitle.textContent = `${sanitizeHTML(wallet.name)} - Transaction History`;

    if (transactions.length === 0) {
      // Create a sample date for the 7th at 18:00 UTC to get the local time
      const sampleDate = new Date();
      sampleDate.setUTCDate(7);
      sampleDate.setUTCHours(18, 0, 0, 0);
      const localTime = sampleDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      transactionList.innerHTML = `<div class="no-transactions">No transactions yet. Withdrawals happen on the 7th of each month at ${localTime}.</div>`;
    } else {
      transactionList.innerHTML = `
        <table class="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>BTC Price</th>
              <th>BTC Withdrawn</th>
              <th>USD Withdrawn</th>
              <th>BTC Remaining</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(tx => `
              <tr>
                <td>${sanitizeHTML(new Date(tx.date).toLocaleDateString())}</td>
                <td class="usd-value">$${tx.btc_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="btc-value">${tx.btc_withdrawn.toFixed(8)} ₿</td>
                <td class="usd-value">$${tx.usd_withdrawn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="btc-value">${tx.btc_remaining.toFixed(8)} ₿</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    modal.classList.add('show');
  } catch (error) {
    console.error('Error loading transaction history:', error);
    alert('Error loading transaction history');
  }
}

// Setup donation button
function setupDonationButton() {
  const donationBtn = document.getElementById('donationBtn');
  const copyFeedback = document.getElementById('copyFeedback');
  const btcAddress = 'bc1q5ayxgfz33zyfkulkh7ujw3kr0uctv23uyeefcf';

  donationBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btcAddress);

      // Show feedback
      copyFeedback.classList.add('show');

      // Hide after 2 seconds
      setTimeout(() => {
        copyFeedback.classList.remove('show');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback: select the text
      const range = document.createRange();
      range.selectNode(donationBtn.querySelector('.donation-address'));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  });
}
