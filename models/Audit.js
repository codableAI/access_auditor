// models/Audit.js
import { db } from '../helpers/db.js';
import { nanoid } from 'nanoid';

async function find(filter = {}) {
  await db.read();
  let audits = db.data.audits;
  for (const key in filter) {
    audits = audits.filter(audit => audit[key] === filter[key]);
  }
  return audits;
}

async function findOne(filter = {}) {
  const audits = await find(filter);
  return audits[0] || null;
}

async function insert(doc) {
  await db.read();
  doc.id = nanoid();
  db.data.audits.push(doc);
  await db.write();
  return doc;
}

async function update(id, updateDoc) {
  await db.read();
  const index = db.data.audits.findIndex(audit => audit.id === id);
  if (index !== -1) {
    db.data.audits[index] = { ...db.data.audits[index], ...updateDoc };
    await db.write();
    return db.data.audits[index];
  }
  return null;
}

export { find, findOne, insert, update };
