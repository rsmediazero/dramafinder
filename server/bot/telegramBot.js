// server/bot/telegramBot.js
const TelegramBot = require('node-telegram-bot-api');
const VIPCodeGenerator = require('../lib/vipCodeGenerator');

class TelegramVIPBot {
    constructor() {
        this.token = '8272055232:AAGKbFpzzLcF-RLJNDS28rYrkgQSPl-mSkY';
        this.bot = new TelegramBot(this.token, { polling: true });
        this.vipGenerator = new VIPCodeGenerator();
        this.adminChatIds = new Set();
        
        this.setupHandlers();
        console.log('🤖 Telegram VIP Bot started...');
    }

    setupHandlers() {
        // Start command
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            this.sendWelcomeMessage(chatId);
        });

        // Generate code commands
        this.bot.onText(/\/generate_weekly/, (msg) => {
            this.handleGenerateCode(msg, 'weekly');
        });

        this.bot.onText(/\/generate_monthly/, (msg) => {
            this.handleGenerateCode(msg, 'monthly');
        });

        // Statistics command
        this.bot.onText(/\/stats/, (msg) => {
            this.handleStatistics(msg);
        });

        // List codes command
        this.bot.onText(/\/codes/, (msg) => {
            this.handleListCodes(msg);
        });

        // Help command
        this.bot.onText(/\/help/, (msg) => {
            this.sendHelpMessage(msg.chat.id);
        });

        // Any message to check if user is admin
        this.bot.on('message', (msg) => {
            this.checkAdminStatus(msg);
        });
    }

    // Check if user is admin based on username
    checkAdminStatus(msg) {
        const username = msg.from.username;
        // GANTI DENGAN USERNAME ADMIN TELEGRAM ANDA
        const adminUsernames = ['rsmediazero', 'username_admin2', 'username_admin3'];
        
        if (adminUsernames.includes(username)) {
            this.adminChatIds.add(msg.chat.id);
            console.log(`✅ Admin detected: @${username}`);
        }
    }

    // Check if user is authorized admin
    isAdmin(chatId) {
        return this.adminChatIds.has(chatId);
    }

    async sendWelcomeMessage(chatId) {
        const message = `🤖 *VIP Code Generator Bot*

Selamat datang di bot generator kode VIP DramaBoxFinder!

*Perintah yang tersedia:*

🔹 /generate_weekly - Generate kode VIP 1 Minggu (Rp 20.000)
🔹 /generate_monthly - Generate kode VIP 1 Bulan (Rp 50.000)
🔹 /stats - Lihat statistik penjualan
🔹 /codes - Lihat daftar kode yang digenerate
🔹 /help - Bantuan

*Admin Only:*
Hanya admin yang terdaftar yang dapat menggunakan perintah ini.`;

        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async sendHelpMessage(chatId) {
        const message = `📖 *Bantuan Penggunaan Bot*

*Cara Menggunakan:*
1. Pilih paket VIP yang ingin digenerate
2. Gunakan perintah:
   - /generate_weekly untuk paket 1 minggu
   - /generate_monthly untuk paket 1 bulan
3. Bagikan kode ke customer

*Informasi Paket:*
🎫 *VIP 1 Minggu*
   - Harga: Rp 20.000
   - Masa aktif: 7 hari

🎫 *VIP 1 Bulan*
   - Harga: Rp 50.000
   - Masa aktif: 30 hari

*Catatan:*
- Kode VIP akan kadaluarsa jika tidak digunakan dalam waktu 7/30 hari
- Satu kode hanya bisa digunakan sekali
- Statistik dapat dilihat dengan /stats`;

        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async handleGenerateCode(msg, packageType) {
        const chatId = msg.chat.id;
        
        if (!this.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, '❌ *Akses Ditolak*\nHanya admin yang dapat generate kode VIP.', { parse_mode: 'Markdown' });
            return;
        }

        try {
            const generatedCode = this.vipGenerator.generateCode(packageType);
            const packageInfo = packageType === 'weekly' ? '1 Minggu' : '1 Bulan';
            const price = packageType === 'weekly' ? '20.000' : '50.000';
            const duration = packageType === 'weekly' ? '7' : '30';

            const message = `✅ *Kode VIP Berhasil Digenerate*

🎫 *Paket:* ${packageInfo}
💰 *Harga:* Rp ${price}
⏰ *Durasi:* ${duration} hari
📅 *Kadaluarsa:* ${new Date(generatedCode.expires_at).toLocaleDateString('id-ID')}

🔐 *Kode VIP:*
\`\`\`
${generatedCode.code}
\`\`\`

*Cara penggunaan:*
1. Berikan kode ini ke customer
2. Customer masuk ke aplikasi DramaBoxFinder
3. Pilih "Masukan Kode" di modal VIP
4. Input kode di atas

⚠️ *Jangan bagikan screenshot ini ke publik!*`;

            await this.bot.sendMessage(chatId, message, { 
                parse_mode: 'Markdown',
                reply_to_message_id: msg.message_id
            });

            console.log(`📦 New VIP Code Generated: ${generatedCode.code} (${packageInfo})`);

        } catch (error) {
            console.error('Error generating code:', error);
            await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat generate kode. Silakan coba lagi.');
        }
    }

    async handleStatistics(msg) {
        const chatId = msg.chat.id;
        
        if (!this.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, '❌ *Akses Ditolak*\nHanya admin yang dapat melihat statistik.', { parse_mode: 'Markdown' });
            return;
        }

        try {
            const stats = this.vipGenerator.getStatistics();
            const activeCodes = this.vipGenerator.getActiveCodesCount();

            const message = `📊 *Statistik VIP Codes*

📦 *Total Generated:* ${stats.total_generated}
✅ *Total Activated:* ${stats.total_activated}
🔄 *Active Codes:* ${activeCodes}

💰 *Revenue:*
• 1 Minggu: ${stats.weekly_sold} x Rp 20.000 = Rp ${(stats.weekly_sold * 20000).toLocaleString('id-ID')}
• 1 Bulan: ${stats.monthly_sold} x Rp 50.000 = Rp ${(stats.monthly_sold * 50000).toLocaleString('id-ID')}
• *Total Revenue:* Rp ${stats.total_revenue.toLocaleString('id-ID')}

📈 *Conversion Rate:* ${stats.total_generated > 0 ? ((stats.total_activated / stats.total_generated) * 100).toFixed(1) : 0}%`;

            await this.bot.sendMessage(chatId, message, { 
                parse_mode: 'Markdown',
                reply_to_message_id: msg.message_id
            });

        } catch (error) {
            console.error('Error getting statistics:', error);
            await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil statistik.');
        }
    }

    async handleListCodes(msg) {
        const chatId = msg.chat.id;
        
        if (!this.isAdmin(chatId)) {
            await this.bot.sendMessage(chatId, '❌ *Akses Ditolak*\nHanya admin yang dapat melihat daftar kode.', { parse_mode: 'Markdown' });
            return;
        }

        try {
            const allCodes = this.vipGenerator.getAllCodes();
            const activeCodes = allCodes.filter(code => !code.activated);
            const usedCodes = allCodes.filter(code => code.activated);

            let message = `📋 *Daftar Kode VIP*\n\n`;

            if (activeCodes.length > 0) {
                message += `🟢 *Active Codes (${activeCodes.length}):*\n`;
                activeCodes.slice(0, 10).forEach(code => {
                    const expiry = new Date(code.expires_at).toLocaleDateString('id-ID');
                    message += `• ${code.code} (${code.package}) - Exp: ${expiry}\n`;
                });
                if (activeCodes.length > 10) {
                    message += `• ...dan ${activeCodes.length - 10} kode lainnya\n`;
                }
                message += `\n`;
            }

            if (usedCodes.length > 0) {
                message += `🔴 *Used Codes (${usedCodes.length}):*\n`;
                usedCodes.slice(0, 5).forEach(code => {
                    const activated = new Date(code.activated_at).toLocaleDateString('id-ID');
                    message += `• ${code.code} (${code.package}) - Used: ${activated}\n`;
                });
                if (usedCodes.length > 5) {
                    message += `• ...dan ${usedCodes.length - 5} kode lainnya\n`;
                }
            }

            if (allCodes.length === 0) {
                message += `📭 Belum ada kode yang digenerate.`;
            }

            await this.bot.sendMessage(chatId, message, { 
                parse_mode: 'Markdown',
                reply_to_message_id: msg.message_id
            });

        } catch (error) {
            console.error('Error listing codes:', error);
            await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil daftar kode.');
        }
    }

    // Method untuk memvalidasi kode dari frontend
    validateVIPCode(code) {
        return this.vipGenerator.validateCode(code);
    }

    // Method untuk mengaktifkan kode dari frontend
    activateVIPCode(code, userInfo = 'Web User') {
        return this.vipGenerator.activateCode(code, userInfo);
    }
}

module.exports = TelegramVIPBot;