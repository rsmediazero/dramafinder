// server/bot/telegramBot.js
const TelegramBot = require('node-telegram-bot-api');
const VIPCodeGenerator = require('../lib/vipCodeGenerator');

class TelegramVIPBot {
    constructor() {
        this.token = '8272055232:AAGKbFpzzLcF-RLJNDS28rYrkgQSPl-mSkY';
        this.bot = null;
        this.vipGenerator = new VIPCodeGenerator();
        this.adminChatIds = new Set();
        
        this.initializeBot();
    }

    initializeBot() {
        try {
            console.log('🔧 Initializing Telegram Bot...');
            
            this.bot = new TelegramBot(this.token, { 
                polling: { 
                    interval: 300,
                    autoStart: true,
                    params: {
                        timeout: 10
                    }
                } 
            });

            // Setup error handlers
            this.setupErrorHandlers();
            
            // Setup message handlers
            this.setupHandlers();
            
            console.log('✅ Telegram VIP Bot initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Telegram Bot:', error.message);
        }
    }

    setupErrorHandlers() {
        this.bot.on('polling_error', (error) => {
            console.error('❌ Polling Error:', error.code, error.message);
        });

        this.bot.on('webhook_error', (error) => {
            console.error('❌ Webhook Error:', error);
        });

        this.bot.on('error', (error) => {
            console.error('❌ General Bot Error:', error);
        });

        this.bot.on('message', (msg) => {
            console.log('📱 Received message from:', msg.from?.username, 'Text:', msg.text);
        });
    }

    setupHandlers() {
        // Start command
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            console.log('✅ /start received from:', msg.from?.username);
            this.sendWelcomeMessage(chatId);
        });

        // Generate code commands
        this.bot.onText(/\/generate_weekly/, (msg) => {
            console.log('🔄 /generate_weekly received');
            this.handleGenerateCode(msg, 'weekly');
        });

        this.bot.onText(/\/generate_monthly/, (msg) => {
            console.log('🔄 /generate_monthly received');
            this.handleGenerateCode(msg, 'monthly');
        });

        // Statistics command
        this.bot.onText(/\/stats/, (msg) => {
            console.log('📊 /stats received');
            this.handleStatistics(msg);
        });

        // List codes command
        this.bot.onText(/\/codes/, (msg) => {
            console.log('📋 /codes received');
            this.handleListCodes(msg);
        });

        // Help command
        this.bot.onText(/\/help/, (msg) => {
            console.log('❓ /help received');
            this.sendHelpMessage(msg.chat.id);
        });

        // Debug command
        this.bot.onText(/\/debug/, (msg) => {
            this.handleDebug(msg);
        });

        // Any message to check if user is admin
        this.bot.on('message', (msg) => {
            this.checkAdminStatus(msg);
        });
    }

    async handleDebug(msg) {
        const chatId = msg.chat.id;
        const userInfo = msg.from;
        
        const debugInfo = `
🤖 *Debug Information*

*User Info:*
- ID: ${userInfo.id}
- Username: @${userInfo.username || 'N/A'}
- First Name: ${userInfo.first_name}
- Language: ${userInfo.language_code}

*Bot Status:*
- Admin Access: ${this.isAdmin(chatId) ? '✅ Yes' : '❌ No'}
- Active Codes: ${this.vipGenerator.getActiveCodesCount()}
- Total Generated: ${this.vipGenerator.getStatistics().total_generated}

*Connection:*
- Bot initialized: ${this.bot ? '✅ Yes' : '❌ No'}
- Token: ${this.token ? '✅ Set' : '❌ Missing'}
        `.trim();

        await this.bot.sendMessage(chatId, debugInfo, { 
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id
        });
    }

    // Check if user is admin based on username
    checkAdminStatus(msg) {
        const username = msg.from?.username;
        if (!username) return;

        // GANTI DENGAN USERNAME ADMIN TELEGRAM ANDA YANG SEBENARNYA
        const adminUsernames = ['rsmediazero', 'admin1', 'admin2']; // Contoh
        
        if (adminUsernames.includes(username.toLowerCase())) {
            this.adminChatIds.add(msg.chat.id);
            console.log(`✅ Admin detected: @${username}`);
            
            // Send welcome to admin
            this.bot.sendMessage(msg.chat.id, 
                `👋 Welcome admin @${username}! You have access to VIP code generation commands.`,
                { reply_to_message_id: msg.message_id }
            );
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
🔹 /debug - Informasi debug
🔹 /help - Bantuan

*Admin Only:*
Hanya admin yang terdaftar yang dapat menggunakan perintah generate.`;

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
- Kode VIP akan kadaluarsa jika tidak digunakan
- Satu kode hanya bisa digunakan sekali
- Statistik dapat dilihat dengan /stats`;

        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    async handleGenerateCode(msg, packageType) {
        const chatId = msg.chat.id;
        const username = msg.from?.username;
        
        console.log(`🔄 Handling generate ${packageType} for @${username}`);
        
        if (!this.isAdmin(chatId)) {
            console.log(`❌ Access denied for @${username}`);
            await this.bot.sendMessage(chatId, 
                '❌ *Akses Ditolak*\nHanya admin yang dapat generate kode VIP.\n\nGunakan /debug untuk info lebih lanjut.', 
                { parse_mode: 'Markdown' }
            );
            return;
        }

        try {
            console.log(`✅ Generating ${packageType} code for admin @${username}`);
            const generatedCode = this.vipGenerator.generateCode(packageType);
            const packageInfo = packageType === 'weekly' ? '1 Minggu' : '1 Bulan';
            const price = packageType === 'weekly' ? '20.000' : '50.000';
            const duration = packageType === 'weekly' ? '7' : '30';

            const message = `✅ *Kode VIP Berhasil Digenerate*

🎫 *Paket:* ${packageInfo}
💰 *Harga:* Rp ${price}
⏰ *Durasi:* ${duration} hari
📅 *Kadaluarsa:* ${new Date(generatedCode.expires_at).toLocaleDateString('id-ID')}
👤 *Generated by:* @${username}

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

            console.log(`📦 New VIP Code Generated: ${generatedCode.code} (${packageInfo}) by @${username}`);

        } catch (error) {
            console.error('❌ Error generating code:', error);
            await this.bot.sendMessage(chatId, 
                '❌ Terjadi kesalahan saat generate kode. Silakan coba lagi.\n\nError: ' + error.message
            );
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
                    const packageName = code.package === 'weekly' ? '1 Minggu' : '1 Bulan';
                    message += `• ${code.code} (${packageName}) - Exp: ${expiry}\n`;
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
                    const packageName = code.package === 'weekly' ? '1 Minggu' : '1 Bulan';
                    message += `• ${code.code} (${packageName}) - Used: ${activated}\n`;
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