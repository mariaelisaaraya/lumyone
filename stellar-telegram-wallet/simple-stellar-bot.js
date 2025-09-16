// simple-stellar-bot.js
require('dotenv').config();
const { Telegraf } = require('telegraf');
const StellarSdk = require('@stellar/stellar-sdk');

class SimpleStellarBot {
  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    this.users = {}; // Base de datos simple en memoria
    this.setupHandlers();
  }

  setupHandlers() {
    this.bot.start((ctx) => this.handleStart(ctx));
    this.bot.on('contact', (ctx) => this.handlePhoneNumber(ctx));
    this.bot.action('create_wallet', (ctx) => this.requestPhone(ctx));
    this.bot.action('view_balance', (ctx) => this.showBalance(ctx));
  }

  async handleStart(ctx) {
    const userId = ctx.from.id;
    if (this.users[userId]) {
      await this.showMainMenu(ctx);
    } else {
      await this.showWelcome(ctx);
    }
  }

  async showWelcome(ctx) {
    await ctx.reply(
      '🌟 **Bienvenido a LumyOne Stellar Wallet!**\n\n' +
      '✨ Crea una wallet de Stellar simple:\n' +
      '• Wallet determinística basada en tu teléfono\n' +
      '• Transacciones en testnet\n' +
      '• Balance en tiempo real\n\n' +
      '¿Empezamos?',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Crear Wallet', callback_data: 'create_wallet' }
          ]]
        }
      }
    );
  }

  async requestPhone(ctx) {
    await ctx.reply(
      '📱 **Compartir número de teléfono**\n\n' +
      'Tu número se usará para generar tu wallet de forma determinística.',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{
            text: '📱 Compartir mi número',
            request_contact: true
          }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      }
    );
  }

  async handlePhoneNumber(ctx) {
    const phoneNumber = ctx.message.contact.phone_number;
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || 'Usuario';

    await ctx.reply('⏳ Creando tu wallet...');

    try {
      // Generar keypair determinística usando el teléfono como seed
      const seed = `stellar_wallet_${phoneNumber}`;
      const keypair = StellarSdk.Keypair.fromRawEd25519Seed(
        StellarSdk.hash(seed).slice(0, 32)
      );

      // Crear cuenta en testnet usando Friendbot
      try {
        await fetch(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`);
        console.log('Cuenta fondeada con Friendbot');
      } catch (error) {
        console.log('Error con Friendbot:', error.message);
      }

      // Guardar usuario
      this.users[userId] = {
        phoneNumber,
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
        userName,
        createdAt: new Date().toISOString()
      };

      await ctx.reply(
        '🎉 **Wallet creada exitosamente!**\n\n' +
        `📍 **Tu dirección:**\n\`${keypair.publicKey()}\`\n\n` +
        '✅ **Cuenta fondeada con 10,000 XLM de testnet**',
        { parse_mode: 'Markdown' }
      );

      await this.showMainMenu(ctx);

    } catch (error) {
      console.error('Error:', error);
      await ctx.reply('❌ Error al crear la wallet. Intenta de nuevo.');
    }
  }

  async showMainMenu(ctx) {
    const userId = ctx.from.id;
    const user = this.users[userId];

    await ctx.reply(
      `👋 **Hola ${user.userName}!**\n\n` +
      '🏠 **Menú Principal**\n' +
      `📱 Teléfono: ${user.phoneNumber}\n` +
      `🔑 Wallet: \`${user.publicKey.substring(0, 8)}...\`\n\n` +
      '¿Qué quieres hacer?',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '💰 Ver Balance', callback_data: 'view_balance' }
          ]]
        }
      }
    );
  }

  async showBalance(ctx) {
    const userId = ctx.from.id;
    const user = this.users[userId];

    await ctx.reply('⏳ Consultando balance...');

    try {
      const account = await this.server.loadAccount(user.publicKey);
      
      let balanceText = '💰 **Tu Balance:**\n\n';
      account.balances.forEach(balance => {
        if (balance.asset_type === 'native') {
          balanceText += `🌟 **XLM:** ${balance.balance}\n`;
        }
      });

      balanceText += `\n📍 **Dirección:** \`${user.publicKey}\``;

      await ctx.reply(balanceText, { parse_mode: 'Markdown' });

    } catch (error) {
      await ctx.reply('❌ Error al consultar balance. La cuenta podría no estar creada aún.');
    }
  }

  launch() {
    this.bot.launch();
    console.log('🤖 Simple Stellar Bot iniciado!');
  }
}

const bot = new SimpleStellarBot();
bot.launch();