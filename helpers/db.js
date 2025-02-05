// helpers/db.js
import { Low, JSONFile } from 'lowdb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data = db.data || { logs: [], apikeys: [], audits: [], adminSettings: [], users: [] };
  await db.write();
}

export { db, initDB };
