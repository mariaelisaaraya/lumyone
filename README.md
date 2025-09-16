# 🌟 Simple Stellar Bot  

A **Telegram bot** for interacting with the **Stellar network (Testnet)** in a simple, educational, and secure way.  
Ideal for **testing, learning, and prototyping** within the Stellar ecosystem.  

---

## 🔑 Key Features  

### 1. Wallet Management  
- **Wallet creation**: generates deterministic Stellar wallets from phone numbers.  
- **QR Codes**: easily share addresses.  
- **Balance inquiry**: shows available XLM balance.  

### 2. Transactions  
- **Send XLM**: to any Stellar address.  
- **Quick amounts**: predefined buttons for 10, 50, and 100 XLM.  
- **Pre-confirmation**: each operation requires validation before execution.  

### 3. Trading  
- **Token swaps**: exchange between **XLM** and **USDC**.  
- **Real-time quotes**.  
- **Soroswap integration** for swaps using their API.  

---

## 🛠 Technical Aspects  
- Based on the **Stellar SDK**.  
- Connection to the **Testnet**.  
- Error handling and operation retries.  
- **In-memory storage** of users.  
- Interactive menus with **Telegram buttons**.  
- **Asynchronous transactions** with step-by-step confirmation.  

---

## 🔄 Workflow  
1. User starts with `/start`.  
2. Creates their wallet by entering a phone number.  
3. Accesses the main menu.  
4. Can perform operations:  
   - Check balances.  
   - Send XLM.  
   - Perform token swaps.  
5. Each important operation requires **prior confirmation**.  

---

## 🧪 Allowed Testnet (testing environment)  
For security and to maintain consistency in testing, this bot only accepts the following **known Testnet address**:  

`GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR`  

**Important:** Do not paste other addresses in this testing environment; if you need to use another wallet, contact the team to change the configuration.  

---

## ⚡ Security  
- Stellar address validation.  
- Confirmations before critical transactions.  
- **Timeouts** in network operations.  

---

## 📌 Objective  
This bot aims to be a **simple yet functional interface** for:  
- Learning about the Stellar network.  
- Testing transactions on Testnet.  
- Exploring token swaps and user flows.  

---

## 🚀 Next Steps: Reflector Integration  

**Reflector** provides reliable real-time data from multiple external sources.  

### Benefits for *LumyOne* and the Bot  

1. **Accurate real-time prices**  
   - Show users the exact value before making swaps.  
   - Example:  
     - `"You have 100 USDC = $100 USD"`  
     - `"You will receive ~850 XLM ($100 USD)"`  

2. **Better UX in the Telegram Bot**  
   - User: `"I want to exchange $50 USD in XLM"`  
   - Bot: `"Based on current prices, you will receive ~425 XLM"`  

3. **Advanced business functionalities**  
   - Smart limits: *“Execute only if XLM < $0.12”*  
   - Financial reports: conversion to USD for **accounting**.  
   - Price alerts: notification when a token reaches a target value.  

4. **Transparency and trust**  
   - “Official” prices vs. values from a specific DEX.  
   - Soroswap ↔ Reflector comparison.  

5. **B2B use cases**  
   - Dynamic payments: *“Pay $100 USD in the token of your choice”*.  
   - Automatic hedging: conversion to stablecoins during volatile periods.  
   - Multi-token billing with values displayed in fiat.  

---

## ✅ Conclusion  
The combination of **Reflector + Soroswap + Account Abstraction** will enable:  
- A better **DeFi B2B experience** on Telegram.  
- Greater trust and transparency for users.  
- **Production-ready** business tools.  
