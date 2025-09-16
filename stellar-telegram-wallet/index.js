import dotenv from 'dotenv';
import StellarTelegramBot from './src/bot/telegram-bot.js';

dotenv.config();

async function main() {
  try {
    console.log('🚀 Iniciando LumyOne Stellar Wallet Bot...');
    console.log('📱 Bot: @LumyOneBot');
    
    const bot = new StellarTelegramBot();
    bot.launch();
    
    console.log('✅ Bot iniciado exitosamente!');
    console.log('💬 Ve a Telegram y envía /start a @LumyOneBot');
    
    // Graceful stop
    process.once('SIGINT', () => {
      console.log('🛑 Cerrando bot...');
      bot.stop('SIGINT');
    });
    process.once('SIGTERM', () => {
      console.log('🛑 Cerrando bot...');
      bot.stop('SIGTERM');
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar:', error);
  }
}

main();