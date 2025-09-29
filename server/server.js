// Di server/server.js
const TelegramVIPBot = require('./bot/telegramBot');

// Inisialisasi bot dengan error handling
let vipBot = null;

const initializeBot = () => {
    try {
        console.log('🔧 Starting Telegram Bot...');
        vipBot = new TelegramVIPBot();
        console.log('✅ Telegram Bot started successfully');
    } catch (error) {
        console.error('❌ Failed to start Telegram Bot:', error.message);
        console.log('⚠️ VIP features will be disabled');
    }
};

// Start bot setelah server ready
setTimeout(() => {
    initializeBot();
}, 2000);

// API endpoints dengan bot availability check
app.post('/api/validate-vip', (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return res.json({ valid: false, message: 'Kode tidak boleh kosong' });
    }

    if (!vipBot) {
        return res.json({ valid: false, message: 'Sistem VIP sedang maintenance. Silakan coba lagi nanti.' });
    }

    try {
        const result = vipBot.validateVIPCode(code);
        res.json(result);
    } catch (error) {
        console.error('VIP Validation Error:', error);
        res.json({ valid: false, message: 'Error validasi kode' });
    }
});

app.post('/api/activate-vip', (req, res) => {
    const { code, userInfo } = req.body;
    
    if (!code) {
        return res.json({ success: false, message: 'Kode tidak boleh kosong' });
    }

    if (!vipBot) {
        return res.json({ success: false, message: 'Sistem VIP sedang maintenance. Silakan coba lagi nanti.' });
    }

    try {
        const result = vipBot.activateVIPCode(code, userInfo || 'Web User');
        res.json(result);
    } catch (error) {
        console.error('VIP Activation Error:', error);
        res.json({ success: false, message: 'Error aktivasi kode' });
    }
});