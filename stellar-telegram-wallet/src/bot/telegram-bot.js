// src/bot/telegram-bot.js
import { Telegraf } from 'telegraf';
import SocialManager from '../social-auth/social-manager.js';
import Database from '../utils/database.js';

class StellarTelegramBot {
  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.socialManager = new SocialManager();
    this.db = new Database();
    this.setupHandlers();
  }

  setupHandlers() {
    // Comando /start
    this.bot.start((ctx) => this.handleStart(ctx));
    
    // Cuando el usuario comparte su teléfono
    this.bot.on('contact', (ctx) => this.handlePhoneNumber(ctx));
    
    // Botones del menú
    this.bot.action('ver_balance', (ctx) => this.showBalance(ctx));
    this.bot.action('crear_wallet', (ctx) => this.requestPhone(ctx));
    this.bot.action('info', (ctx) => this.showInfo(ctx));
  }

  async handleStart(ctx) {
    const userId = ctx.from.id;
    const user = await this.db.getUser(userId);

    if (user) {
      // Usuario ya existe
      await this.showMainMenu(ctx, user);
    } else {
      // Usuario nuevo
      await this.showWelcome(ctx);
    }
  }

  async showWelcome(ctx) {
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Crear mi Social Wallet', callback_data: 'crear_wallet' }],
          [{ text: 'ℹ️ ¿Qué es esto?', callback_data: 'info' }]
        ]
      }
    };

    await ctx.reply(
      '🌟 **¡Bienvenido a LumyOne Stellar Wallet!**\n\n' +
      '✨ Crea una wallet de Stellar sin complicaciones:\n' +
      '• Sin claves privadas que recordar\n' +
      '• Recuperación con tu teléfono\n' +
      '• Transacciones fáciles y seguras\n\n' +
      '¿Empezamos?',
      { parse_mode: 'Markdown', ...keyboard }
    );
  }

  async showInfo(ctx) {
    await ctx.reply(
      '🌟 **¿Qué es una Social Wallet?**\n\n' +
      '🔐 **Seguridad simplificada:**\n' +
      '• No necesitas recordar claves privadas\n' +
      '• Tu teléfono es tu llave de acceso\n' +
      '• Respaldado por smart contracts\n\n' +
      '⚡ **Red Stellar:**\n' +
      '• Transacciones en 3-5 segundos\n' +
      '• Costos ultra bajos (~$0.00001)\n' +
      '• Compatible con el ecosistema crypto\n\n' +
      '🛡️ **Recuperación fácil:**\n' +
      '• Si pierdes acceso, usa tu teléfono\n' +
      '• Sin seed phrases complicadas\n' +
      '• Siempre tienes control de tus fondos'
    );
  }

  async requestPhone(ctx) {
    const keyboard = {
      reply_markup: {
        keyboard: [[{
          text: '📱 Compartir mi número',
          request_contact: true
        }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    };

    await ctx.reply(
      '📱 **Compartir número de teléfono**\n\n' +
      'Tu número se usará para:\n' +
      '• Crear tu wallet de forma segura\n' +
      '• Recuperar tu cuenta si es necesario\n' +
      '• Autenticación sin contraseñas\n\n' +
      'Haz clic en el botón de abajo:',
      { parse_mode: 'Markdown', ...keyboard }
    );
  }

  async handlePhoneNumber(ctx) {
    const phoneNumber = ctx.message.contact.phone_number;
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || 'Usuario';

    await ctx.reply('⏳ Creando tu Social Wallet...');

    try {
      // Crear wallet usando el Social SDK
      const result = await this.socialManager.createWalletWithPhone(userId, phoneNumber);

      if (result.success) {
        // Guardar usuario en base de datos
        await this.db.saveUser({
          telegramId: userId,
          phoneNumber: phoneNumber,
          publicKey: result.publicKey,
          userName: userName,
          createdAt: new Date().toISOString(),
          walletType: 'social'
        });

        await ctx.reply(
          '🎉 **¡Wallet creada exitosamente!**\n\n' +
          `📍 **Tu dirección:**\n\`${result.publicKey}\`\n\n` +
          '✅ **¡Ya puedes usarla!**',
          { parse_mode: 'Markdown' }
        );

        // Mostrar menú principal
        const user = await this.db.getUser(userId);
        await this.showMainMenu(ctx, user);

      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Error:', error);
      await ctx.reply('❌ Error al crear la wallet. Intenta de nuevo.');
    }
  }

  async showMainMenu(ctx, user) {
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💰 Ver Balance', callback_data: 'ver_balance' }
          ],
          [
            { text: '👤 Mi Perfil', callback_data: 'perfil' }
          ]
        ]
      }
    };

    await ctx.reply(
      `👋 **¡Hola ${user.userName}!**\n\n` +
      '🏠 **Menú Principal**\n' +
      `📱 Teléfono: ${user.phoneNumber}\n` +
      `🔑 Wallet: \`${user.publicKey.substring(0, 8)}...\`\n\n` +
      '¿Qué quieres hacer?',
      { parse_mode: 'Markdown', ...keyboard }
    );
  }

  async showBalance(ctx) {
    try {
      const userId = ctx.from.id;
      const user = await this.db.getUser(userId);

      await ctx.reply('⏳ Consultando balance...');

      const result = await this.socialManager.getBalance(user.phoneNumber);

      if (result.success) {
        let balanceText = '💰 **Tu Balance:**\n\n';
        
        result.balances.forEach(balance => {
          if (balance.asset_type === 'native') {
            balanceText += `🌟 **XLM:** ${balance.balance}\n`;
          } else {
            balanceText += `🪙 **${balance.asset_code}:** ${balance.balance}\n`;
          }
        });

        balanceText += `\n📍 **Dirección:** \`${result.publicKey}\``;

        await ctx.reply(balanceText, { parse_mode: 'Markdown' });
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Error:', error);
      await ctx.reply('❌ Error al consultar balance.');
    }
  }

  launch() {
    this.bot.launch();
    console.log('🤖 LumyOne Bot iniciado!');
  }

  stop() {
    this.bot.stop();
  }
}

export default StellarTelegramBot;
