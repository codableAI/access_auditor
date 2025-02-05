// models/ApiKey.js
import { db } from '../helpers/db.js';
import { nanoid } from 'nanoid';

async function find(filter = {}) {
  await db.read();
  let keys = db.data.apikeys;
  for (const key in filter) {
    keys = keys.filter(k => k[key] === filter[key]);
  }
  return keys;
}

async function findOne(filter = {}) {
  const keys = await find(filter);
  return keys[0] || null;
}

async function insert(doc) {
  await db.read();
  doc.id = nanoid();
  db.data.apikeys.push(doc);
  await db.write();
  return doc;
}

async function remove(id) {
  await db.read();
  const index = db.data.apikeys.findIndex(key => key.id === id);
  if (index !== -1) {
    db.data.apikeys.splice(index, 1);
    await db.write();
    return true;
  }
  return false;
}

export { find, findOne, insert, remove };
