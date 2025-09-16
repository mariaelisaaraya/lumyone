// src/social-auth/social-manager.js
import * as StellarSDK from 'stellar-social-sdk';

class SocialManager {
  constructor() {
    this.sdk = null;
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      this.sdk = new StellarSDK.StellarSocialSDK({
        contractId: process.env.SOCIAL_CONTRACT_ID || 'demo-contract',
        network: process.env.STELLAR_NETWORK || 'testnet',
        horizonUrl: process.env.HORIZON_URL
      });

      await this.sdk.initialize();
      this.initialized = true;
      console.log('✅ Social SDK inicializado');
    }
  }

  async createWalletWithPhone(telegramUserId, phoneNumber) {
    try {
      await this.initialize();

      console.log(`Creando wallet para: ${phoneNumber}`);

      // Usar el SDK para autenticación con teléfono
      const result = await this.sdk.authenticateWithPhone({
        phoneNumber: phoneNumber,
        verificationCode: '123456', // En demo usa código fijo
        metadata: {
          telegramUserId: telegramUserId,
          createdAt: new Date().toISOString()
        }
      });

      if (result.success) {
        return {
          success: true,
          publicKey: result.account.publicKey,
          account: result.account,
          phoneNumber: phoneNumber
        };
      } else {
        throw new Error('SDK authentication failed');
      }

    } catch (error) {
      console.error('Error creating wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getBalance(phoneNumber) {
    try {
      await this.initialize();

      // Recuperar cuenta por teléfono
      const authResult = await this.sdk.authenticateWithPhone({
        phoneNumber: phoneNumber,
        verificationCode: '123456'
      });

      if (authResult.success) {
        const balances = await authResult.account.getBalance();
        return {
          success: true,
          balances: balances,
          publicKey: authResult.account.publicKey
        };
      } else {
        throw new Error('Could not authenticate');
      }

    } catch (error) {
      console.error('Error getting balance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default SocialManager;
