// server/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ========== TELEGRAM BOT INTEGRATION ==========
let vipBot = null;
try {
    const TelegramVIPBot = require('./bot/telegramBot'); // Path RELATIF
    vipBot = new TelegramVIPBot();
    console.log('✅ Telegram Bot initialized successfully');
} catch (error) {
    console.error('❌ Telegram Bot failed:', error.message);
}
// ==============================================

// API Routes yang sudah ada
app.post('/api/latest', (req, res) => {
    // ... code existing Anda
});

app.post('/api/search', (req, res) => {
    // ... code existing Anda  
});

app.post('/api/stream-link', (req, res) => {
    // ... code existing Anda
});

// ========== VIP API ROUTES BARU ==========
app.post('/api/validate-vip', (req, res) => {
    if (!vipBot) {
        return res.json({ valid: false, message: 'Sistem VIP sedang maintenance' });
    }
    
    const { code } = req.body;
    const result = vipBot.validateVIPCode(code);
    res.json(result);
});

app.post('/api/activate-vip', (req, res) => {
    if (!vipBot) {
        return res.json({ success: false, message: 'Sistem VIP sedang maintenance' });
    }
    
    const { code } = req.body;
    const result = vipBot.activateVIPCode(code, 'Web User');
    res.json(result);
});
// =========================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});