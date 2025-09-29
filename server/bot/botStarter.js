// server/bot/botStarter.js
const TelegramBot = require('node-telegram-bot-api');

// Test connection simple
console.log('🔧 Testing Telegram Bot Connection...');

const token = '8272055232:AAGKbFpzzLcF-RLJNDS28rYrkgQSPl-mSkY';

try {
    const bot = new TelegramBot(token, { 
        polling: { 
            interval: 300,
            autoStart: true,
            params: {
                timeout: 10
            }
        } 
    });

    bot.on('polling_error', (error) => {
        console.error('❌ Polling Error:', error.code, error.message);
    });

    bot.on('webhook_error', (error) => {
        console.error('❌ Webhook Error:', error);
    });

    bot.on('error', (error) => {
        console.error('❌ General Bot Error:', error);
    });

    // Simple start command
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        console.log('✅ Bot received /start from:', msg.from.username);
        bot.sendMessage(chatId, '🤖 Bot is working! Connection successful.');
    });

    // Test command
    bot.onText(/\/test/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, '✅ Test response received! Bot is active.');
    });

    console.log('✅ Bot started successfully with token');
    console.log('📱 Send /start to your bot on Telegram to test');

} catch (error) {
    console.error('❌ Failed to initialize bot:', error.message);
}