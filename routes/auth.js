// routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import { find, findOne, insert } from '../models/User.js';

const router = express.Router();

router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('register', { error: 'Username and password required' });
  }
  const existing = await findOne({ username });
  if (existing) {
    return res.render('register', { error: 'Username already taken' });
  }
  const allUsers = await find({});
  const role = (allUsers.length === 0) ? 'admin' : 'user';
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await insert({ username, password: hashedPassword, role });
  req.session.user = newUser;
  res.redirect('/');
});

router.get('/login', (req, res) => {
  res.render('login_auth', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await findOne({ username });
  if (!user) {
    return res.render('login_auth', { error: 'Invalid credentials' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.render('login_auth', { error: 'Invalid credentials' });
  }
  req.session.user = user;
  res.redirect('/');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

export default router;
