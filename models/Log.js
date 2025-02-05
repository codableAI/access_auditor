// models/Log.js
import { db } from '../helpers/db.js';
import { nanoid } from 'nanoid';

async function find(filter = {}) {
  await db.read();
  let logs = db.data.logs;
  for (const key in filter) {
    logs = logs.filter(log => log[key] === filter[key]);
  }
  return logs;
}

async function insert(doc) {
  await db.read();
  doc.id = nanoid();
  db.data.logs.push(doc);
  await db.write();
  return doc;
}

export { find, insert };
