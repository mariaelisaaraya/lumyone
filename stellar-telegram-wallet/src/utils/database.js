// src/utils/database.js
import { promises as fs } from 'fs';

class Database {
  constructor() {
    this.dbPath = process.env.DB_PATH || './users.json';
  }

  async loadData() {
    try {
      const data = await fs.readFile(this.dbPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Si no existe el archivo, crear uno vacío
      return { users: {} };
    }
  }

  async saveData(data) {
    await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2));
  }

  async getUser(telegramId) {
    const data = await this.loadData();
    return data.users[telegramId] || null;
  }

  async saveUser(userData) {
    const data = await this.loadData();
    data.users[userData.telegramId] = userData;
    await this.saveData(data);
    console.log(`✅ Usuario guardado: ${userData.phoneNumber}`);
  }
}

export default Database;

