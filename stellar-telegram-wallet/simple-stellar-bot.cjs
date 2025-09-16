// simple-stellar-bot.cjs
require('dotenv').config();
const { Telegraf } = require('telegraf');
const StellarSdk = require('@stellar/stellar-sdk');
const https = require('https');
const QRCode = require('qrcode');


class SimpleStellarBot {
    constructor() {
        const agent = new https.Agent({
            timeout: 30000, 
            keepAlive: true
        });

        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
            telegram: {
                agent: agent
            }
        });

        this.server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
        this.users = {}; 
        this.setupHandlers();
    }

    setupHandlers() {
        this.bot.start((ctx) => this.handleStart(ctx));
        this.bot.on('contact', (ctx) => this.handlePhoneNumber(ctx));
        this.bot.action('create_wallet', (ctx) => this.requestPhone(ctx));
        this.bot.action('view_balance', (ctx) => this.showBalance(ctx));
        this.bot.action('send_xlm', (ctx) => this.startSendFlow(ctx));
        this.bot.action('send_to_address', (ctx) => this.sendToStellarAddress(ctx));
        this.bot.action('back_to_menu', (ctx) => this.showMainMenu(ctx));
        this.bot.action('quick_10', (ctx) => this.processTransaction(ctx, '10'));
        this.bot.action('quick_50', (ctx) => this.processTransaction(ctx, '50'));
        this.bot.action('quick_100', (ctx) => this.processTransaction(ctx, '100'));
        this.bot.action('confirm_tx', (ctx) => this.executeTransaction(ctx));
        this.bot.action('back_to_menu', (ctx) => this.showMainMenu(ctx));
        this.bot.action('show_qr', (ctx) => this.showQRCode(ctx));
        this.bot.action('swap_tokens', (ctx) => this.startSwapFlow(ctx));
        this.bot.action('swap_xlm_usdc', (ctx) => this.requestSwapAmount(ctx, 'XLM', 'USDC'));
        this.bot.action('swap_usdc_xlm', (ctx) => this.requestSwapAmount(ctx, 'USDC', 'XLM'));
        this.bot.action('view_prices', (ctx) => this.showTokenPrices(ctx));
        this.bot.action('view_prices', (ctx) => this.showTokenPrices(ctx));
        this.bot.action('swap_amount_10', (ctx) => this.getSwapQuote(ctx, '10'));
        this.bot.action('swap_amount_50', (ctx) => this.getSwapQuote(ctx, '50'));
        this.bot.action('swap_amount_100', (ctx) => this.getSwapQuote(ctx, '100'));

        this.bot.on('text', (ctx) => {
            const userId = ctx.from.id;
            const text = ctx.message.text;

            if (!this.users[userId] && text !== '/start') {
                this.handlePhoneText(ctx);
            } else if (this.users[userId]) {
                this.handleRecipientInput(ctx);
            }
        });

        this.bot.catch((err, ctx) => {
            console.error('Error en el bot:', err);
            if (ctx && ctx.reply) {
                ctx.reply('❌ Ocurrió un error. Por favor, intenta de nuevo.');
            }
        });
    }

    async handleStart(ctx) {
        const userId = ctx.from.id;
        delete this.users[userId]; // Reset temporal
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
            '📱 **Número para la wallet**\n\n' +
            'Para testing, puedes escribir cualquier número o texto.\n' +
            'Ejemplo: +123456789 o "test123"',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: 'Escribe un número o texto...'
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
            const seed = `stellar_wallet_${phoneNumber}`;
            const keypair = StellarSdk.Keypair.fromRawEd25519Seed(
                StellarSdk.hash(seed).slice(0, 32)
            );

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                await fetch(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                console.log('Cuenta fondeada con Friendbot');
            } catch (error) {
                console.log('Error con Friendbot:', error.message);
            }

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
            console.error('Error crear wallet phone:', error);
            await ctx.reply('❌ Error al crear la wallet. Intenta de nuevo.');
        }
    }

    async handlePhoneText(ctx) {
        const phoneNumber = ctx.message.text;
        const userId = ctx.from.id;
        const userName = ctx.from.first_name || 'Usuario';

        await ctx.reply('⏳ Creando tu wallet de prueba...');

        try {
            const seed = `stellar_wallet_${phoneNumber}`;
            const keypair = StellarSdk.Keypair.fromRawEd25519Seed(
                StellarSdk.hash(seed).slice(0, 32)
            );

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                await fetch(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                console.log('Cuenta fondeada con Friendbot');
            } catch (error) {
                console.log('Error con Friendbot:', error.message);
            }

            this.users[userId] = {
                phoneNumber,
                publicKey: keypair.publicKey(),
                secretKey: keypair.secret(),
                userName,
                createdAt: new Date().toISOString()
            };

            await ctx.reply(
                '🎉 **Wallet de prueba creada!**\n\n' +
                `📍 **Tu dirección:**\n\`${keypair.publicKey()}\`\n\n` +
                '✅ **Cuenta fondeada con XLM de testnet**',
                { parse_mode: 'Markdown' }
            );

            await this.showMainMenu(ctx);

        } catch (error) {
            console.error('Error crear wallet text:', error);
            await ctx.reply('❌ Error al crear la wallet. Intenta de nuevo.');
        }
    }

    async showMainMenu(ctx) {
        try {
            const userId = ctx.from.id;
            const user = this.users[userId];

            if (!user) {
                await ctx.reply('❌ No tienes una wallet creada. Usa /start para crear una.');
                return;
            }

            await ctx.reply(
                `👋 **Hola ${user.userName}!**\n\n` +
                '🏠 **Menú Principal**\n' +
                `📱 Teléfono: ${user.phoneNumber}\n` +
                `🔑 Wallet: \`${user.publicKey.substring(0, 8)}...\`\n\n` +
                '¿Qué quieres hacer?',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💰 Ver Balance', callback_data: 'view_balance' }],
                            [{ text: '💸 Enviar XLM', callback_data: 'send_xlm' }],
                            [{ text: '🔄 Swap Tokens', callback_data: 'swap_tokens' }],
                            [{ text: '📱 Mi QR', callback_data: 'show_qr' }]
                        ]
                    }
                }
            );
        } catch (error) {
            console.error('Error en showMainMenu:', error);
            await ctx.reply('❌ Error al mostrar el menú. Intenta /start de nuevo.');
        }
    }

    async showBalance(ctx) {
        const userId = ctx.from.id;
        const user = this.users[userId];

        if (!user) {
            await ctx.reply('❌ No tienes una wallet creada. Usa /start para crear una.');
            return;
        }

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

            await ctx.reply(balanceText, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔙 Volver al menú', callback_data: 'back_to_menu' }
                    ]]
                }
            });

        } catch (error) {
            console.error('Error balance:', error);
            await ctx.reply('❌ Error al consultar balance. La cuenta podría no estar creada aún.');
        }
    }

    async showQRCode(ctx) {
        const userId = ctx.from.id;
        const user = this.users[userId];

        if (!user) {
            await ctx.reply('❌ No tienes una wallet creada. Usa /start para crear una.');
            return;
        }

        await ctx.reply('⏳ Generando tu QR...');

        try {
            const qrBuffer = await QRCode.toBuffer(user.publicKey, {
                type: 'png',
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            await ctx.replyWithPhoto(
                { source: qrBuffer },
                {
                    caption:
                        `📱 **Tu QR para recibir XLM**\n\n` +
                        `🔑 **Dirección:** \`${user.publicKey}\`\n\n` +
                        `💡 **Otros pueden escanear este QR para enviarte XLM**`,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔙 Volver al menú', callback_data: 'back_to_menu' }
                        ]]
                    }
                }
            );

        } catch (error) {
            console.error('Error generando QR:', error);
            await ctx.reply('❌ Error al generar el QR. Intenta de nuevo.');
        }
    }

    async startSwapFlow(ctx) {
        const userId = ctx.from.id;
        const user = this.users[userId];

        if (!user) {
            await ctx.reply('❌ No tienes una wallet creada. Usa /start para crear una.');
            return;
        }

        await ctx.reply(
            '🔄 **Swap de Tokens**\n\n' +
            '¿Qué quieres hacer?',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💱 XLM → USDC', callback_data: 'swap_xlm_usdc' }],
                        [{ text: '💱 USDC → XLM', callback_data: 'swap_usdc_xlm' }],
                        // [{ text: '📊 Ver Precios', callback_data: 'view_prices' }],
                        [{ text: '🔙 Volver al menú', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    }

    async requestSwapAmount(ctx, fromToken, toToken) {
        const userId = ctx.from.id;

        // Guardar temporalmente el swap
        if (!this.users[userId].tempSwap) {
            this.users[userId].tempSwap = {};
        }
        this.users[userId].tempSwap = { fromToken, toToken };

        await ctx.reply(
            `💱 **Swap ${fromToken} → ${toToken}**\n\n` +
            `¿Cuánto ${fromToken} quieres cambiar?`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '10 ' + fromToken, callback_data: 'swap_amount_10' }],
                        [{ text: '50 ' + fromToken, callback_data: 'swap_amount_50' }],
                        [{ text: '100 ' + fromToken, callback_data: 'swap_amount_100' }],
                        [{ text: '🔙 Cancelar', callback_data: 'swap_tokens' }]
                    ],
                    force_reply: true,
                    input_field_placeholder: `Cantidad de ${fromToken}...`
                }
            }
        );
    }

    async authenticateSoroswap() {
        try {
            // 1. Registrar usuario (solo una vez)
            const registerData = {
                // username: "lumy_bot_user",
                password: "bdbSS2025",
                email: "buendiabuilders@gmail.com"
            };

            console.log('Intentando registro...');
            const registerResponse = await fetch('https://soroswap-api-staging-436722401508.us-central1.run.app/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData)
            });

            if (registerResponse.status !== 201 && registerResponse.status !== 409) {
                throw new Error(`Registration failed: ${registerResponse.status}`);
            }
            console.log('Registro OK (o usuario ya existe)');

            // 2. Login para obtener access_token
            const loginData = {
                email: "buendiabuilders@gmail.com",
                password: "bdbSS2025"
            };

            console.log('Haciendo login...');
            const loginResponse = await fetch('https://soroswap-api-staging-436722401508.us-central1.run.app/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });

            if (!loginResponse.ok) {
                throw new Error(`Login failed: ${loginResponse.status}`);
            }

            const loginResult = await loginResponse.json();
            console.log('Login exitoso!');

            // Guardar token para uso posterior
            this.soroswapToken = loginResult.access_token;
            return loginResult.access_token;

        } catch (error) {
            console.error('Error en autenticación Soroswap:', error);
            return null;
        }
    }

    async getSwapQuote(ctx, amount) {
        const userId = ctx.from.id;
        const user = this.users[userId];
        const swap = user.tempSwap;

        await ctx.reply('⏳ Consultando mejor precio...');

        try {
            const tokenAddresses = {
                'XLM': 'native', 
                'USDC': 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA' 
            };

            const assetIn = tokenAddresses[swap.fromToken];
            const assetOut = tokenAddresses[swap.toToken];

            console.log('Debug - Swap request:', {
                fromToken: swap.fromToken,
                toToken: swap.toToken,
                amount: amount,
                assetIn: assetIn,
                assetOut: assetOut
            });

            const requestBody = {
                assetIn: assetIn,
                assetOut: assetOut,
                amount: (parseFloat(amount) * 10000000).toString(), 
                tradeType: 'EXACT_IN'
            };

            console.log('Debug - Request body:', requestBody);

            // PI KEY
            const quoteResponse = await fetch('https://soroswap-api-staging-436722401508.us-central1.run.app/quote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'sk_417fd0cbec2d50d5892266ddfe8bcdb1af14ed4e3f9ce713e1f58b75aa36d9ab'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Debug - Response status:', quoteResponse.status);

            if (!quoteResponse.ok) {
                const errorText = await quoteResponse.text();
                console.log('Debug - Error response:', errorText);
                throw new Error(`API Error: ${quoteResponse.status} - ${errorText}`);
            }

            const quote = await quoteResponse.json();
            console.log('Debug - Quote response:', quote);

            // Convertir respuesta a formato legible
            const amountOut = (parseInt(quote.amountOut) / 10000000).toFixed(6);
            const priceImpact = quote.priceImpact || '0.1';

            await ctx.reply(
                `💱 **Cotización de Swap**\n\n` +
                `📤 **Das:** ${amount} ${swap.fromToken}\n` +
                `📥 **Recibes:** ${amountOut} ${swap.toToken}\n` +
                `📊 **Precio:** 1 ${swap.fromToken} = ${(parseFloat(amountOut) / parseFloat(amount)).toFixed(4)} ${swap.toToken}\n` +
                `⚡ **Impacto:** ~${priceImpact}%\n\n` +
                `¿Confirmas el swap?`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✅ Confirmar Swap', callback_data: 'confirm_swap' }],
                            [{ text: '❌ Cancelar', callback_data: 'swap_tokens' }]
                        ]
                    }
                }
            );

            // Guardar cotización para el swap
            user.tempSwap.amount = amount;
            user.tempSwap.quote = quote;
            user.tempSwap.amountOut = amountOut;

        } catch (error) {
            console.error('Error completo en getSwapQuote:', error);
            await ctx.reply(
                `❌ **Error obteniendo cotización**\n\n` +
                `Detalles: ${error.message}\n\n` +
                'Intenta con una cantidad menor.',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔄 Intentar de nuevo', callback_data: 'swap_tokens' }
                        ]]
                    }
                }
            );
        }
    }

    // Función auxiliar para procesar la respuesta
    async processQuoteResponse(ctx, quote, amount, swap) {
        const userId = ctx.from.id;
        const user = this.users[userId];

        // Convertir respuesta a formato legible
        const amountOut = (parseInt(quote.amountOut) / 10000000).toFixed(6);
        const priceImpact = quote.priceImpact || '0.1';

        await ctx.reply(
            `💱 **Cotización de Swap**\n\n` +
            `📤 **Das:** ${amount} ${swap.fromToken}\n` +
            `📥 **Recibes:** ${amountOut} ${swap.toToken}\n` +
            `📊 **Precio:** 1 ${swap.fromToken} = ${(parseFloat(amountOut) / parseFloat(amount)).toFixed(4)} ${swap.toToken}\n` +
            `⚡ **Impacto:** ~${priceImpact}%\n\n` +
            `¿Confirmas el swap?`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Confirmar Swap', callback_data: 'confirm_swap' }],
                        [{ text: '❌ Cancelar', callback_data: 'swap_tokens' }]
                    ]
                }
            }
        );

        user.tempSwap.amount = amount;
        user.tempSwap.quote = quote;
        user.tempSwap.amountOut = amountOut;
    }


    async showTokenPrices(ctx) {
        await ctx.reply('⏳ Consultando precios...');

        try {
            await ctx.reply(
                '📊 **Precios Actuales**\n\n' +
                '💰 **XLM/USDC:** ~$0.12\n' +
                '🔄 **24h:** +2.3%\n\n' +
                '_Precios aproximados desde Soroswap_',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔙 Volver', callback_data: 'swap_tokens' }
                        ]]
                    }
                }
            );
        } catch (error) {
            await ctx.reply('❌ Error obteniendo precios.');
        }
    }

    async startSendFlow(ctx) {
        const userId = ctx.from.id;
        const user = this.users[userId];

        if (!user) {
            await ctx.reply('❌ No tienes una wallet creada. Usa /start para crear una.');
            return;
        }

        await ctx.reply(
            '💸 **Enviar XLM**\n\n' +
            '¿A quién quieres enviar?',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔑 Dirección Stellar', callback_data: 'send_to_address' }],
                        [{ text: '📋 Pegar desde clipboard', callback_data: 'send_to_address' }],
                        [{ text: '🔙 Volver al menú', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    }

    async sendToStellarAddress(ctx) {
        await ctx.reply(
            '🔑 **Enviar a Dirección Stellar**\n\n' +
            'Pega la dirección pública del destinatario:\n' +
            'Ejemplo: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: 'Dirección Stellar...'
                }
            }
        );
    }

    async handleRecipientInput(ctx) {
        const text = ctx.message.text;

        if (text.startsWith('G') && text.length === 56) {
            if (StellarSdk.StrKey.isValidEd25519PublicKey(text)) {
                await this.requestAmount(ctx, 'stellar_address', text);
            } else {
                await ctx.reply('❌ Dirección Stellar inválida. Debe empezar con G y tener 56 caracteres.');
            }
        } else {
            await ctx.reply('❌ Por favor, envía una dirección Stellar válida (empieza con G, 56 caracteres).');
        }
    }

    async requestAmount(ctx, recipientType, recipient) {
        const userId = ctx.from.id;
        if (!this.users[userId].tempTransaction) {
            this.users[userId].tempTransaction = {};
        }
        this.users[userId].tempTransaction.recipient = recipient;
        this.users[userId].tempTransaction.recipientType = recipientType;

        await ctx.reply(
            `💰 **Monto a enviar**\n\n` +
            `📤 **Destinatario:** ${recipient.substring(0, 20)}...\n\n` +
            'Escribe la cantidad de XLM a enviar o usa los botones:',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '10 XLM', callback_data: 'quick_10' }],
                        [{ text: '50 XLM', callback_data: 'quick_50' }],
                        [{ text: '100 XLM', callback_data: 'quick_100' }],
                        [{ text: '🔙 Cancelar', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    }

    async processTransaction(ctx, amount) {
        const userId = ctx.from.id;
        const user = this.users[userId];
        const tempTx = user.tempTransaction;

        if (!tempTx) {
            await ctx.reply('❌ Error: No hay transacción pendiente.');
            return;
        }

        await ctx.reply(
            `✅ **Confirmar transacción**\n\n` +
            `📤 **Para:** ${tempTx.recipient.substring(0, 30)}...\n` +
            `💰 **Monto:** ${amount} XLM\n` +
            `⚡ **Fee:** ~0.00001 XLM\n\n` +
            '¿Confirmas el envío?',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Confirmar', callback_data: 'confirm_tx' }],
                        [{ text: '❌ Cancelar', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );

        user.tempTransaction.amount = amount;
    }

    async executeTransaction(ctx) {
        const userId = ctx.from.id;
        const user = this.users[userId];
        const tempTx = user.tempTransaction;

        if (!tempTx) {
            await ctx.reply('❌ Error: No hay transacción pendiente.');
            return;
        }

        await ctx.reply('⏳ Procesando transacción...');

        try {
            // 1. Validar que el destinatario sea una dirección válida
            if (!StellarSdk.StrKey.isValidEd25519PublicKey(tempTx.recipient)) {
                throw new Error('Dirección destinataria inválida');
            }

            // 2. Cargar cuenta del remitente
            const sourceKeypair = StellarSdk.Keypair.fromSecret(user.secretKey);
            const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey());

            // 3. Verificar que la cuenta destinataria existe
            try {
                await this.server.loadAccount(tempTx.recipient);
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    throw new Error('La cuenta destinataria no existe en Stellar');
                }
                throw error;
            }

            // 4. Crear transacción
            const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: StellarSdk.Networks.TESTNET
            })
                .addOperation(StellarSdk.Operation.payment({
                    destination: tempTx.recipient,
                    asset: StellarSdk.Asset.native(),
                    amount: tempTx.amount.toString()
                }))
                .setTimeout(30)
                .build();

            // 5. Firmar transacción
            transaction.sign(sourceKeypair);

            // 6. Enviar a la red
            const result = await this.server.submitTransaction(transaction);

            await ctx.reply(
                `✅ **¡Transacción exitosa!**\n\n` +
                `💰 **Enviado:** ${tempTx.amount} XLM\n` +
                `📤 **Para:** ${tempTx.recipient.substring(0, 20)}...\n` +
                // `🔗 **Hash:** \`${result.hash}\``,
                `🌐 **Ver en:** stellar.expert/explorer/testnet/tx/${result.hash}`,
                { parse_mode: 'Markdown' }
            );

            // 7. Limpiar transacción temporal
            delete user.tempTransaction;

            // 8. Volver al menú principal después de 3 segundos
            setTimeout(() => this.showMainMenu(ctx), 3000);

        } catch (error) {
            console.error('Error en transacción:', error);

            let errorMessage = '❌ **Error al enviar la transacción**\n\n';

            if (error.message.includes('underfunded')) {
                errorMessage += 'Saldo insuficiente para realizar la transacción.';
            } else if (error.message.includes('no existe')) {
                errorMessage += 'La cuenta destinataria no existe en Stellar.';
            } else if (error.message.includes('inválida')) {
                errorMessage += 'La dirección destinataria no es válida.';
            } else {
                errorMessage += 'Error de red o problema técnico. Intenta de nuevo.';
            }

            await ctx.reply(errorMessage, { parse_mode: 'Markdown' });

            // Limpiar transacción temporal
            delete user.tempTransaction;

            // Volver al menú
            setTimeout(() => this.showMainMenu(ctx), 2000);
        }
    }

    async launch() {
        const maxRetries = 5;
        let attempt = 1;

        while (attempt <= maxRetries) {
            try {
                console.log(`🤖 Intento ${attempt} - Iniciando Simple Stellar Bot...`);

                // Probar conexión primero
                const me = await this.bot.telegram.getMe();
                console.log(`✅ Conectado como: @${me.username}`);

                // Iniciar el bot
                await this.bot.launch();
                console.log('🚀 Bot iniciado exitosamente!');

                process.once('SIGINT', () => this.bot.stop('SIGINT'));
                process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

                return; 

            } catch (error) {
                console.error(`❌ Intento ${attempt} falló:`, error.message);

                if (attempt === maxRetries) {
                    console.error('🔥 No se pudo conectar después de varios intentos.');
                    console.error('Verifica tu conexión a internet y el token de Telegram.');
                    process.exit(1);
                }

                const delay = Math.min(attempt * 2000, 10000);
                console.log(`⏳ Esperando ${delay / 1000} segundos antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
            }
        }
    }
}

const bot = new SimpleStellarBot();
bot.launch();