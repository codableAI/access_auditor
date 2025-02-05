// models/AdminSettings.js
import { db } from '../helpers/db.js';

async function getSettings() {
  await db.read();
  return db.data.adminSettings[0] || null;
}

async function setSettings(settings) {
  await db.read();
  if (db.data.adminSettings.length === 0) {
    db.data.adminSettings.push(settings);
  } else {
    db.data.adminSettings[0] = settings;
  }
  await db.write();
  return settings;
}

export { getSettings, setSettings };
