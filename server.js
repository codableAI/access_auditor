// server.js
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadConfig } from './helpers/config.js';
import { initDB } from './helpers/db.js';

import apiRoutes from './routes/api.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';

const config = loadConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await initDB();
console.log('Local database initialized.');

const app = express();

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);

// Root: if logged in and admin, redirect to admin dashboard; else to login.
app.get('/', (req, res) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    res.redirect('/admin');
  } else {
    res.redirect('/auth/login');
  }
});

app.listen(config.port, () => {
  console.log(`Server started on port ${config.port}`);
});
