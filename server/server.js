// Di server/server.js, tambahkan kode berikut:

const TelegramVIPBot = require('./bot/telegramBot');

// Inisialisasi bot (jalankan sekali saja)
let vipBot;
try {
    vipBot = new TelegramVIPBot();
    console.log('🤖 Telegram VIP Bot initialized');
} catch (error) {
    console.error('❌ Failed to initialize Telegram Bot:', error);
}

// API untuk validasi kode VIP
app.post('/api/validate-vip', (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return res.json({ valid: false, message: 'Kode tidak boleh kosong' });
    }

    if (!vipBot) {
        return res.json({ valid: false, message: 'Sistem VIP sedang maintenance' });
    }

    const result = vipBot.validateVIPCode(code);
    res.json(result);
});

// API untuk aktivasi kode VIP
app.post('/api/activate-vip', (req, res) => {
    const { code, userInfo } = req.body;
    
    if (!code) {
        return res.json({ success: false, message: 'Kode tidak boleh kosong' });
    }

    if (!vipBot) {
        return res.json({ success: false, message: 'Sistem VIP sedang maintenance' });
    }

    const result = vipBot.activateVIPCode(code, userInfo || 'Web User');
    res.json(result);
});

// API untuk statistics (admin only)
app.get('/api/vip-statistics', (req, res) => {
    // Tambahkan auth check di sini jika diperlukan
    if (!vipBot) {
        return res.json({ error: 'Sistem VIP tidak tersedia' });
    }
    
    const stats = vipBot.vipGenerator.getStatistics();
    res.json(stats);
});