# ₿ Bitcoin Retire

**Can you live forever on 1 BTC?**

An interactive experiment that simulates living on 1 Bitcoin by withdrawing a fixed monthly amount in USD. This project tracks 5 different withdrawal strategies to see if Bitcoin's long-term appreciation could sustain indefinite withdrawals.

## 🎯 Concept

Each simulation starts with **1 BTC** and withdraws a fixed USD amount monthly based on Bitcoin's current price:

- 💚 **Good help**: $1,000/month
- 💙 **Boost life quality**: $2,000/month
- 🧡 **Comfortable living**: $3,000/month
- 💜 **Premium lifestyle**: $4,000/month
- ❤️ **Luxury freedom**: $5,000/month

The experiment answers: Will Bitcoin's price appreciation outpace your withdrawals?

## 🚀 Features

- **Real-time BTC price** tracking via CoinGecko API
- **5 parallel simulations** with different withdrawal amounts
- **Automated monthly withdrawals** (1st of each month)
- **Beautiful dashboard** with Bitcoin-themed design
- **Interactive charts** showing BTC balance evolution
- **SQLite database** for persistent data storage

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- SQLite3 (better-sqlite3)
- node-cron for scheduled tasks
- axios for API calls

**Frontend:**
- HTML5 + Modern CSS
- Vanilla JavaScript
- Chart.js for visualizations

## 📦 Installation

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Server runs on `http://localhost:3000`

## 🎮 Usage

### Automatic Mode
The server automatically processes monthly withdrawals on the 1st of each month at midnight (Europe/Paris timezone).

### Manual Testing
Click the "Trigger Monthly Withdrawal" button on the dashboard to manually process a withdrawal cycle.

## 📊 API Endpoints

- `GET /api/wallets` - Get all wallets status
- `GET /api/wallets/:id/history` - Get transaction history
- `GET /api/btc-price` - Get current BTC price
- `POST /api/trigger-withdrawal` - Manually trigger withdrawal

## 🗂️ Project Structure

```
bitcoin-retire/
├── server/
│   ├── db/
│   │   └── database.js          # SQLite setup
│   ├── services/
│   │   ├── bitcoinPrice.js      # BTC price fetching
│   │   └── walletService.js     # Wallet logic
│   ├── jobs/
│   │   └── monthlyWithdrawal.js # Cron job
│   ├── routes/
│   │   └── api.js               # API routes
│   └── server.js                # Main server
├── public/
│   ├── index.html               # Frontend HTML
│   ├── style.css                # Styling
│   └── app.js                   # Frontend JS
└── package.json
```

## 🎨 Design

Modern, Bitcoin-inspired design with:
- Orange (#F7931A) primary color
- Dark theme
- Responsive layout
- Smooth animations
- Interactive charts

## 📝 Configuration

**Timezone:** Edit in `server/jobs/monthlyWithdrawal.js`
```javascript
timezone: "Europe/Paris"
```

**Port:** Set environment variable
```bash
PORT=3000 npm start
```

## 🚢 Deployment

Suitable for deployment on:
- Heroku
- Railway
- Render
- DigitalOcean
- Any Node.js hosting

Make sure to:
1. Set the correct timezone
2. Ensure the server stays running for cron jobs
3. Backup the SQLite database regularly

## ⚠️ Disclaimer

This is a simulation for educational and entertainment purposes only. Not financial advice. Past performance doesn't guarantee future results.

## 🧡 Live Long and Hodl!

Built with ❤️ and ₿
