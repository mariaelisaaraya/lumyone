# 🌟 Simple Stellar Bot  

Un bot de **Telegram** para interactuar con la **red Stellar (Testnet)** de forma simple, didáctica y segura.  
Ideal para **pruebas, aprendizaje y prototipos** en el ecosistema Stellar.  

---

## 🔑 Funcionalidades Principales  

### 1. Gestión de Wallets  
- **Creación de wallets**: genera carteras Stellar determinísticas a partir de números telefónicos.  
- **QR Codes**: permite compartir direcciones fácilmente.  
- **Consulta de balance**: muestra el saldo de XLM disponible.  

### 2. Transacciones  
- **Envío de XLM**: a cualquier dirección Stellar.  
- **Montos rápidos**: botones predefinidos de 10, 50 y 100 XLM.  
- **Confirmación previa**: cada operación requiere validación antes de ejecutarse.  

### 3. Trading  
- **Swaps de tokens**: intercambio entre **XLM** y **USDC**.  
- **Cotizaciones en tiempo real**.  
- **Integración con Soroswap** para realizar swaps mediante su API.  

---

## 🛠 Aspectos Técnicos  
- Basado en el **SDK de Stellar**.  
- Conexión a la **red Testnet**.  
- Manejo de errores y reintentos en operaciones.  
- **Almacenamiento en memoria** de usuarios.  
- Menús interactivos con **botones en Telegram**.  
- Transacciones **asíncronas con confirmación paso a paso**.  

---

## 🔄 Flujo de Trabajo  
1. El usuario inicia con `/start`.  
2. Crea su wallet ingresando un número de teléfono.  
3. Accede al menú principal.  
4. Puede realizar operaciones:  
   - Consultar balances.  
   - Enviar XLM.  
   - Hacer swaps de tokens.  
5. Cada operación importante requiere **confirmación previa**.  

---

## ⚡ Seguridad  
- Validación de direcciones Stellar.  
- Confirmaciones antes de transacciones críticas.  
- **Timeouts** en operaciones de red.  

---

## 📌 Objetivo  
Este bot busca ser una interfaz **simple pero funcional** para:  
- Aprender sobre la red Stellar.  
- Probar transacciones en Testnet.  
- Explorar swaps de tokens y flujos de usuario.  

---

## 🚀 Próximos Pasos: Integración con Reflector  
 
Integrar reflector nos podría proporcionar datos confiables en tiempo real desde múltiples fuentes externas.  

### Beneficios para *LumyOne* y el Bot  
1. **Precios precisos en tiempo real**  
   - Mostrar a los usuarios el valor exacto antes de hacer swaps.  
   - Ejemplo:  
     - `"Tienes 100 USDC = $100 USD"`  
     - `"Recibirás ~850 XLM ($100 USD)"`  

2. **Mejor UX en el Bot de Telegram**  
   - Usuario: `"Quiero cambiar $50 USD en XLM"`  
   - Bot: `"Basado en precios actuales, recibirás ~425 XLM"`  

3. **Funcionalidades empresariales avanzadas**  
   - Límites inteligentes: *“Ejecutar solo si XLM < $0.12”*  
   - Reportes financieros: conversión a USD para **accounting**.  
   - Alertas de precio: notificación cuando un token alcanza un valor objetivo.  

4. **Transparencia y confianza**  
   - Precios “oficiales” vs valores de un DEX específico.  
   - Comparación Soroswap ↔ Reflector.  

5. **Casos de uso B2B**  
   - Pagos dinámicos: *“Pagar $100 USD en el token que prefieras”*.  
   - Hedging automático: conversión a stablecoins en periodos de volatilidad.  
   - Facturación multi-token con valores mostrados en fiat.  

---

La combinación de **Reflector + Soroswap + Account Abstraction** permitirá:  
- Mejor experiencia **DeFi B2B** en Telegram.  
- Mayor confianza y transparencia para los personas usuarias.  
- Herramientas empresariales listas para producción.  
