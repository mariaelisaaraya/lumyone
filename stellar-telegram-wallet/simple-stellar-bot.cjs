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
        this.bot.action('confirm_swap', async (ctx) => {
            try {
                await ctx.answerCbQuery('Processing swap...');
                await this.executeSwap(ctx);
            } catch (error) {
                console.error('Error in confirm_swap:', error);
                await ctx.answerCbQuery('Error processing swap');
                await ctx.reply('❌ Technical error. Please try again.');
            }
        });
        this.bot.action('swap_tokens', async (ctx) => {
            try {
                await ctx.answerCbQuery('Returning to swap menu...');
                await this.startSwapFlow(ctx);
            } catch (error) {
                console.error('Error in swap_tokens:', error);
                await ctx.answerCbQuery('Error returning to menu');
                await this.showMainMenu(ctx);
            }
        });
        this.bot.action('back_to_menu', async (ctx) => {
            try {
                const userId = ctx.from.id;
                const user = this.users[userId];

                if (user.tempSwap) delete user.tempSwap;
                if (user.tempTransaction) delete user.tempTransaction;

                await ctx.answerCbQuery('Returning to main menu...');
                await this.showMainMenu(ctx);
            } catch (error) {
                console.error('Error in back_to_menu:', error);
                await ctx.answerCbQuery('Error returning to menu');
                await this.showMainMenu(ctx);
            }
        });

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
            console.error('Bot error:', err);
            if (ctx && ctx.reply) {
                ctx.reply('❌ An error occurred. Please try again.');
            }
        });
    }

    async handleStart(ctx) {
        const userId = ctx.from.id;
        delete this.users[userId];
        if (this.users[userId]) {
            await this.showMainMenu(ctx);
        } else {
            await this.showWelcome(ctx);
        }
    }

    async showWelcome(ctx) {
        await ctx.reply(
            '🌟 **Welcome to LumyOne Stellar Wallet!**\n\n' +
            '✨ Create a simple Stellar wallet:\n' +
            '• Deterministic wallet based on your phone\n' +
            '• Testnet transactions\n' +
            '• Real-time balance\n\n' +
            'Shall we begin?',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🚀 Create Wallet', callback_data: 'create_wallet' }
                    ]]
                }
            }
        );
    }

    async requestPhone(ctx) {
        await ctx.reply(
            '📱 **Number for wallet**\n\n' +
            'For testing, you can enter any number or text.\n' +
            'Example: +123456789 or "test123"',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: 'Enter a number or text...'
                }
            }
        );
    }

    async handlePhoneNumber(ctx) {
        const phoneNumber = ctx.message.contact.phone_number;
        const userId = ctx.from.id;
        const userName = ctx.from.first_name || 'User';

        await ctx.reply('⏳ Creating your wallet...');

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
                console.log('Account funded with Friendbot');
            } catch (error) {
                console.log('Friendbot error:', error.message);
            }

            this.users[userId] = {
                phoneNumber,
                publicKey: keypair.publicKey(),
                secretKey: keypair.secret(),
                userName,
                createdAt: new Date().toISOString()
            };

            await ctx.reply(
                '🎉 **Wallet created successfully!**\n\n' +
                `📍 **Your address:**\n\`${keypair.publicKey()}\`\n\n` +
                '✅ **Account funded with 10,000 testnet XLM**',
                { parse_mode: 'Markdown' }
            );

            await this.showMainMenu(ctx);

        } catch (error) {
            console.error('Error creating wallet with phone:', error);
            await ctx.reply('❌ Error creating wallet. Please try again.');
        }
    }

    async handlePhoneText(ctx) {
        const phoneNumber = ctx.message.text;
        const userId = ctx.from.id;
        const userName = ctx.from.first_name || 'User';

        await ctx.reply('⏳ Creating your test wallet...');

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
                console.log('Account funded with Friendbot');
            } catch (error) {
                console.log('Friendbot error:', error.message);
            }

            this.users[userId] = {
                phoneNumber,
                publicKey: keypair.publicKey(),
                secretKey: keypair.secret(),
                userName,
                createdAt: new Date().toISOString()
            };

            await ctx.reply(
                '🎉 **Test wallet created!**\n\n' +
                `📍 **Your address:**\n\`${keypair.publicKey()}\`\n\n` +
                '✅ **Account funded with testnet XLM**',
                { parse_mode: 'Markdown' }
            );

            await this.showMainMenu(ctx);

        } catch (error) {
            console.error('Error creating wallet with text:', error);
            await ctx.reply('❌ Error creating wallet. Please try again.');
        }
    }

    async showMainMenu(ctx) {
        try {
            const userId = ctx.from.id;
            const user = this.users[userId];

            if (!user) {
                await ctx.reply('❌ You don\'t have a wallet. Use /start to create one.');
                return;
            }

            await ctx.reply(
                `👋 **Hello ${user.userName}!**\n\n` +
                '🏠 **Main Menu**\n' +
                `📱 Phone: ${user.phoneNumber}\n` +
                `🔑 Wallet: \`${user.publicKey.substring(0, 8)}...\`\n\n` +
                'What would you like to do?',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💰 View Balance', callback_data: 'view_balance' }],
                            [{ text: '💸 Send XLM', callback_data: 'send_xlm' }],
                            [{ text: '🔄 Swap Tokens', callback_data: 'swap_tokens' }],
                            [{ text: '📱 My QR', callback_data: 'show_qr' }]
                        ]
                    }
                }
            );
        } catch (error) {
            console.error('Error in showMainMenu:', error);
            await ctx.reply('❌ Error displaying menu. Please try /start again.');
        }
    }

    async showBalance(ctx) {
        const userId = ctx.from.id;
        const user = this.users[userId];

        if (!user) {
            await ctx.reply('❌ You don\'t have a wallet. Use /start to create one.');
            return;
        }

        await ctx.reply('⏳ Checking balance...');

        try {
            const account = await this.server.loadAccount(user.publicKey);

            let balanceText = '💰 **Your Balance:**\n\n';
            account.balances.forEach(balance => {
                if (balance.asset_type === 'native') {
                    balanceText += `🌟 **XLM:** ${balance.balance}\n`;
                }
            });

            balanceText += `\n📍 **Address:** \`${user.publicKey}\``;

            await ctx.reply(balanceText, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔙 Back to menu', callback_data: 'back_to_menu' }
                    ]]
                }
            });

        } catch (error) {
            console.error('Balance error:', error);
            await ctx.reply('❌ Error checking balance. The account may not be created yet.');
        }
    }

    async showQRCode(ctx) {
        const userId = ctx.from.id;
        const user = this.users[userId];

        if (!user) {
            await ctx.reply('❌ You don\'t have a wallet. Use /start to create one.');
            return;
        }

        await ctx.reply('⏳ Generating your QR...');

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
                        `📱 **Your QR to receive XLM**\n\n` +
                        `🔑 **Address:** \`${user.publicKey}\`\n\n` +
                        `💡 **Others can scan this QR to send you XLM**`,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔙 Back to menu', callback_data: 'back_to_menu' }
                        ]]
                    }
                }
            );

        } catch (error) {
            console.error('Error generating QR:', error);
            await ctx.reply('❌ Error generating QR. Please try again.');
        }
    }

    async startSwapFlow(ctx) {
        const userId = ctx.from.id;
        const user = this.users[userId];

        if (!user) {
            await ctx.reply('❌ You don\'t have a wallet. Use /start to create one.');
            return;
        }

        await ctx.reply(
            '🔄 **Token Swap**\n\n' +
            'What would you like to do?',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '💱 XLM → USDC', callback_data: 'swap_xlm_usdc' }],
                        [{ text: '💱 USDC → XLM', callback_data: 'swap_usdc_xlm' }],
                        [{ text: '🔙 Back to menu', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    }

    async requestSwapAmount(ctx, fromToken, toToken) {
        const userId = ctx.from.id;

        if (!this.users[userId].tempSwap) {
            this.users[userId].tempSwap = {};
        }
        this.users[userId].tempSwap = { fromToken, toToken };

        await ctx.reply(
            `💱 **Swap ${fromToken} → ${toToken}**\n\n` +
            `How much ${fromToken} do you want to exchange?`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '10 ' + fromToken, callback_data: 'swap_amount_10' }],
                        [{ text: '50 ' + fromToken, callback_data: 'swap_amount_50' }],
                        [{ text: '100 ' + fromToken, callback_data: 'swap_amount_100' }],
                        [{ text: '🔙 Cancel', callback_data: 'swap_tokens' }]
                    ],
                    force_reply: true,
                    input_field_placeholder: `Amount of ${fromToken}...`
                }
            }
        );
    }

    async authenticateSoroswap() {
        try {
            console.log('🔐 Starting Soroswap authentication...');

            const loginData = {
                email: "buendiabuilders@gmail.com",
                password: "bdbSS2025"
            };

            console.log('Logging in...');
            const loginResponse = await fetch('https://soroswap-api-staging-436722401508.us-central1.run.app/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'LumyBot/1.0'
                },
                body: JSON.stringify(loginData)
            });

            if (loginResponse.status === 404 || loginResponse.status === 401) {
                console.log('User not found, trying registration...');

                const registerData = {
                    password: "bdbSS2025",
                    email: "buendiabuilders@gmail.com"
                };

                const registerResponse = await fetch('https://soroswap-api-staging-436722401508.us-central1.run.app/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'LumyBot/1.0'
                    },
                    body: JSON.stringify(registerData)
                });

                if (!registerResponse.ok && registerResponse.status !== 409) {
                    const regError = await registerResponse.text();
                    console.log('Registration error:', regError);
                    throw new Error(`Registration failed: ${registerResponse.status}`);
                }

                console.log('Registration OK, retrying login...');

                const retryLoginResponse = await fetch('https://soroswap-api-staging-436722401508.us-central1.run.app/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'LumyBot/1.0'
                    },
                    body: JSON.stringify(loginData)
                });

                if (!retryLoginResponse.ok) {
                    const retryError = await retryLoginResponse.text();
                    console.log('Retry login error:', retryError);
                    throw new Error(`Login retry failed: ${retryLoginResponse.status}`);
                }

                const retryResult = await retryLoginResponse.json();
                this.soroswapToken = retryResult.access_token;
                console.log('✅ Authentication successful after registration!');
                return retryResult.access_token;
            }

            if (!loginResponse.ok) {
                const loginError = await loginResponse.text();
                console.log('Login error:', loginError);
                throw new Error(`Login failed: ${loginResponse.status} - ${loginError}`);
            }

            const loginResult = await loginResponse.json();
            this.soroswapToken = loginResult.access_token;
            console.log('✅ Login successful!');

            return loginResult.access_token;

        } catch (error) {
            console.error('❌ Soroswap authentication error:', error);
            return null;
        }
    }

    async getSwapQuote(ctx, amount) {
        const userId = ctx.from.id;
        const user = this.users[userId];
        const swap = user.tempSwap;

        await ctx.reply('⏳ Getting best price...');

        try {
            const tokenAddresses = {
                'XLM': 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
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
                tradeType: 'EXACT_IN',
                protocols: ['soroswap'],
                slippageBps: 50
            };

            console.log('Debug - Request body:', requestBody);

            const quoteResponse = await fetch('https://api.soroswap.finance/quote?network=testnet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer sk_417fd0cbec2d50d5892266ddfe8bcdb1af14ed4e3f9ce713e1f58b75aa36d9ab`
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

            return this.processQuoteResponse(ctx, quote, amount, swap);

        } catch (error) {
            console.error('Complete error in getSwapQuote:', error);

            let errorMsg = '❌ **Error getting quote**\n\n';

            if (error.message.includes('400')) {
                errorMsg += 'Error in swap parameters.\nTry with a different amount.';
            } else if (error.message.includes('403') || error.message.includes('401')) {
                errorMsg += 'Permission error in Soroswap.\nService may be temporarily unavailable.';
            } else {
                errorMsg += `Details: ${error.message}\n\nTry with a smaller amount.`;
            }

            await ctx.reply(errorMsg, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔄 Try again', callback_data: 'swap_tokens' }
                    ]]
                }
            });
        }
    }

    async processQuoteResponse(ctx, quote, amount, swap) {
        const userId = ctx.from.id;
        const user = this.users[userId];

        try {
            const amountOut = (parseInt(quote.amountOut) / 10000000).toFixed(6);
            const priceImpact = quote.priceImpactPct || '0';

            await ctx.reply(
                `💱 **Swap Quote**\n\n` +
                `📤 **You give:** ${amount} ${swap.fromToken}\n` +
                `📥 **You receive:** ${amountOut} ${swap.toToken}\n` +
                `📊 **Price:** 1 ${swap.fromToken} = ${(parseFloat(amountOut) / parseFloat(amount)).toFixed(4)} ${swap.toToken}\n` +
                `⚡ **Impact:** ${priceImpact}%\n` +
                `🔄 **Protocol:** ${quote.routePlan[0]?.swapInfo?.protocol || 'soroswap'}\n\n` +
                `Confirm the swap?`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✅ Confirm Swap', callback_data: 'confirm_swap' }],
                            [{ text: '❌ Cancel', callback_data: 'swap_tokens' }]
                        ]
                    }
                }
            );

            user.tempSwap.amount = amount;
            user.tempSwap.quote = quote;
            user.tempSwap.amountOut = amountOut;

        } catch (error) {
            console.error('Error processing response:', error);
            throw error;
        }
    }

    async executeSwap(ctx) {
        const userId = ctx.from.id;
        const user = this.users[userId];
        const swap = user.tempSwap;

        if (!swap || !swap.quote) {
            await ctx.reply('❌ Error: No pending swap.');
            return;
        }

        await ctx.reply('⏳ Processing swap...');

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const finalAmountOut = (parseInt(swap.quote.amountOut) / 10000000).toFixed(6);
            const priceImpact = swap.quote.priceImpactPct || '0';

            const simulatedHash = this.generateSimulatedHash();

            await ctx.reply(
                `✅ **Swap successful!**\n\n` +
                `📤 **You sent:** ${swap.amount} ${swap.fromToken}\n` +
                `📥 **You received:** ${finalAmountOut} ${swap.toToken}\n` +
                `📊 **Price:** 1 ${swap.fromToken} = ${(parseFloat(finalAmountOut) / parseFloat(swap.amount)).toFixed(4)} ${swap.toToken}\n` +
                `⚡ **Impact:** ${priceImpact}%\n` +
                `🔗 **Hash:** \`${simulatedHash}\`\n` +
                `🌐 **Status:** Confirmed on testnet\n\n` +
                `_Simulated swap - Would execute via SoroSwap in production_`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🏠 Main Menu', callback_data: 'back_to_menu' }],
                            [{ text: '🔄 Make another Swap', callback_data: 'swap_tokens' }]
                        ]
                    }
                }
            );

            delete user.tempSwap;

            console.log(`✅ Simulated swap successful for user ${userId}: ${swap.amount} ${swap.fromToken} → ${finalAmountOut} ${swap.toToken}`);

        } catch (error) {
            console.error('Error in swap simulation:', error);

            await ctx.reply(
                '❌ **Error processing swap**\n\n' +
                'There was a technical problem.\n' +
                'Please try again in a moment.',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔄 Try again', callback_data: 'swap_tokens' }],
                            [{ text: '🏠 Main menu', callback_data: 'back_to_menu' }]
                        ]
                    }
                }
            );
        }
    }

    generateSimulatedHash() {
        const chars = '0123456789abcdef';
        let hash = '';
        for (let i = 0; i < 64; i++) {
            hash += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return hash;
    }

    async signAndSubmitSwap(ctx, executeResult, swap) {
        try {
            const userId = ctx.from.id;
            const user = this.users[userId];

            const transactionXDR = executeResult.transaction || executeResult.xdr;

            const sourceKeypair = StellarSdk.Keypair.fromSecret(user.secretKey);

            const transaction = StellarSdk.TransactionBuilder.fromXDR(
                transactionXDR,
                StellarSdk.Networks.TESTNET
            );

            transaction.sign(sourceKeypair);

            const result = await this.server.submitTransaction(transaction);

            await ctx.reply(
                `✅ **Swap successful!**\n\n` +
                `📤 **You sent:** ${swap.amount} ${swap.fromToken}\n` +
                `📥 **You received:** ${swap.amountOut} ${swap.toToken}\n` +
                `🔗 **Hash:** \`${result.hash}\`\n` +
                `🌐 **View on:** stellar.expert/explorer/testnet/tx/${result.hash}`,
                { parse_mode: 'Markdown' }
            );

        } catch (error) {
            console.error('Error signing swap:', error);
            throw new Error(`Error signing transaction: ${error.message}`);
        }
    }

    async showTokenPrices(ctx) {
        await ctx.reply('⏳ Getting prices...');

        try {
            await ctx.reply(
                '📊 **Current Prices**\n\n' +
                '💰 **XLM/USDC:** ~$0.12\n' +
                '🔄 **24h:** +2.3%\n\n' +
                '_Approximate prices from Soroswap_',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔙 Back', callback_data: 'swap_tokens' }
                        ]]
                    }
                }
            );
        } catch (error) {
            await ctx.reply('❌ Error getting prices.');
        }
    }

    async startSendFlow(ctx) {
        const userId = ctx.from.id;
        const user = this.users[userId];

        if (!user) {
            await ctx.reply('❌ You don\'t have a wallet. Use /start to create one.');
            return;
        }

        await ctx.reply(
            '💸 **Send XLM**\n\n' +
            'Who do you want to send to?',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔑 Stellar Address', callback_data: 'send_to_address' }],
                        [{ text: '📋 Paste from clipboard', callback_data: 'send_to_address' }],
                        [{ text: '🔙 Back to menu', callback_data: 'back_to_menu' }]
                    ]
                }
            }
        );
    }

    async sendToStellarAddress(ctx) {
        await ctx.reply(
            '🔑 **Send to Stellar Address**\n\n' +
            'Paste the recipient\'s public address:\n' +
            'Example: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    force_reply: true,
                    input_field_placeholder: 'Stellar address...'
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
                await ctx.reply('❌ Invalid Stellar address. Must start with G and be 56 characters long.');
            }
        } else {
            await ctx.reply('❌ Please send a valid Stellar address (starts with G, 56 characters).');
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
            `💰 **Amount to send**\n\n` +
            `📤 **Recipient:** ${recipient.substring(0, 20)}...\n\n` +
            'Enter the amount of XLM to send or use the buttons:',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '10 XLM', callback_data: 'quick_10' }],
                        [{ text: '50 XLM', callback_data: 'quick_50' }],
                        [{ text: '100 XLM', callback_data: 'quick_100' }],
                        [{ text: '🔙 Cancel', callback_data: 'back_to_menu' }]
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
            await ctx.reply('❌ Error: No pending transaction.');
            return;
        }

        await ctx.reply(
            `✅ **Confirm transaction**\n\n` +
            `📤 **To:** ${tempTx.recipient.substring(0, 30)}...\n` +
            `💰 **Amount:** ${amount} XLM\n` +
            `⚡ **Fee:** ~0.00001 XLM\n\n` +
            'Confirm the transfer?',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Confirm', callback_data: 'confirm_tx' }],
                        [{ text: '❌ Cancel', callback_data: 'back_to_menu' }]
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
            await ctx.reply('❌ Error: No pending transaction.');
            return;
        }

        await ctx.reply('⏳ Processing transaction...');

        try {
            if (!StellarSdk.StrKey.isValidEd25519PublicKey(tempTx.recipient)) {
                throw new Error('Invalid recipient address');
            }

            const sourceKeypair = StellarSdk.Keypair.fromSecret(user.secretKey);
            const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey());

            try {
                await this.server.loadAccount(tempTx.recipient);
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    throw new Error('Recipient account does not exist on Stellar');
                }
                throw error;
            }

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

            transaction.sign(sourceKeypair);

            const result = await this.server.submitTransaction(transaction);

            await ctx.reply(
                `✅ **Transaction successful!**\n\n` +
                `💰 **Sent:** ${tempTx.amount} XLM\n` +
                `📤 **To:** ${tempTx.recipient.substring(0, 20)}...\n` +
                `🌐 **View on:** stellar.expert/explorer/testnet/tx/${result.hash}`,
                { parse_mode: 'Markdown' }
            );

            delete user.tempTransaction;

            setTimeout(() => this.showMainMenu(ctx), 3000);

        } catch (error) {
            console.error('Transaction error:', error);

            let errorMessage = '❌ **Error sending transaction**\n\n';

            if (error.message.includes('underfunded')) {
                errorMessage += 'Insufficient balance to complete the transaction.';
            } else if (error.message.includes('does not exist')) {
                errorMessage += 'Recipient account does not exist on Stellar.';
            } else if (error.message.includes('Invalid')) {
                errorMessage += 'Recipient address is not valid.';
            } else {
                errorMessage += 'Network error or technical problem. Please try again.';
            }

            await ctx.reply(errorMessage, { parse_mode: 'Markdown' });

            delete user.tempTransaction;

            setTimeout(() => this.showMainMenu(ctx), 2000);
        }
    }

    async launch() {
        const maxRetries = 5;
        let attempt = 1;

        while (attempt <= maxRetries) {
            try {
                console.log(`🤖 Attempt ${attempt} - Starting Simple Stellar Bot...`);

                const me = await this.bot.telegram.getMe();
                console.log(`✅ Connected as: @${me.username}`);

                await this.bot.launch();
                console.log('🚀 Bot started successfully!');

                process.once('SIGINT', () => this.bot.stop('SIGINT'));
                process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

                return;

            } catch (error) {
                console.error(`❌ Attempt ${attempt} failed:`, error.message);

                if (attempt === maxRetries) {
                    console.error('🔥 Could not connect after several attempts.');
                    console.error('Check your internet connection and Telegram token.');
                    process.exit(1);
                }

                const delay = Math.min(attempt * 2000, 10000);
                console.log(`⏳ Waiting ${delay / 1000} seconds before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
            }
        }
    }
}

const bot = new SimpleStellarBot();
bot.launch();