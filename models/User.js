// models/User.js
import { db } from '../helpers/db.js';
import { nanoid } from 'nanoid';

async function find(filter = {}) {
  await db.read();
  let users = db.data.users || [];
  for (const key in filter) {
    users = users.filter(user => user[key] === filter[key]);
  }
  return users;
}

async function findOne(filter = {}) {
  const users = await find(filter);
  return users[0] || null;
}

async function insert(doc) {
  await db.read();
  doc.id = nanoid();
  db.data.users = db.data.users || [];
  db.data.users.push(doc);
  await db.write();
  return doc;
}

async function update(id, updateDoc) {
  await db.read();
  const index = db.data.users.findIndex(user => user.id === id);
  if (index !== -1) {
    db.data.users[index] = { ...db.data.users[index], ...updateDoc };
    await db.write();
    return db.data.users[index];
  }
  return null;
}

export { find, findOne, insert, update };
