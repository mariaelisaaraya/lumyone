// test-sdk.js
import dotenv from 'dotenv';
dotenv.config();

async function testSDK() {
  try {
    // Probar diferentes formas de importar
    console.log('Probando importación del SDK...');
    
    // Método 1: Importar todo
    const sdk = await import('stellar-social-sdk');
    console.log('✅ Importación exitosa');
    console.log('📋 Propiedades disponibles:', Object.keys(sdk));
    
    // Ver si StellarSocialSDK existe
    if (sdk.StellarSocialSDK) {
      console.log('✅ StellarSocialSDK encontrada');
    } else {
      console.log('❌ StellarSocialSDK no encontrada');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSDK();
