// routes/admin.js
import express from 'express';
import schedule from 'node-schedule';
import { loadConfig, saveConfig } from '../helpers/config.js';
import { getSettings, setSettings } from '../models/AdminSettings.js';
import * as Log from '../models/Log.js';
import * as ApiKey from '../models/ApiKey.js';
import * as Audit from '../models/Audit.js';

const router = express.Router();

// Middleware: only allow if logged in user is admin.
function adminAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  } else {
    return res.redirect('/auth/login');
  }
}

router.get('/', adminAuth, async (req, res) => {
  const settings = await getSettings();
  const logs = await Log.find({});
  const counts = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    counts[key] = 0;
  }
  logs.forEach(log => {
    const key = new Date(log.timestamp).toISOString().split('T')[0];
    if (counts.hasOwnProperty(key)) counts[key]++;
  });
  const labels = Object.keys(counts).sort();
  const dataPoints = labels.map(label => counts[label]);
  
  const allAudits = await Audit.find({});
  const audits = allAudits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  
  res.render('dashboard', { settings, logChartLabels: JSON.stringify(labels), logChartData: JSON.stringify(dataPoints), audits });
});

router.get('/logs', adminAuth, async (req, res) => {
  const logs = (await Log.find({})).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.render('logs', { logs });
});

router.get('/apikeys', adminAuth, async (req, res) => {
  const keys = await ApiKey.find({});
  res.render('apikeys', { keys });
});

router.get('/apikeys/new', adminAuth, (req, res) => {
  res.render('new_apikey', { error: null });
});

router.post('/apikeys/new', adminAuth, async (req, res) => {
  try {
    const { scopes, expiration, rateLimit, owner } = req.body;
    const newApiKeyPlain = require('crypto').randomBytes(16).toString('hex');
    const keyId = require('crypto').randomBytes(8).toString('hex');
    const hashedKey = await require('bcrypt').hash(newApiKeyPlain, 10);
    await ApiKey.insert({
      keyId,
      hashedKey,
      scopes: scopes ? scopes.split(',').map(s => s.trim()) : [],
      expiration: expiration ? new Date(expiration) : null,
      rateLimit: rateLimit ? Number(rateLimit) : null,
      owner
    });
    res.redirect('/admin/apikeys');
  } catch (error) {
    res.render('new_apikey', { error: error.message });
  }
});

router.post('/apikeys/delete/:id', adminAuth, async (req, res) => {
  const id = req.params.id;
  await ApiKey.remove(id);
  res.redirect('/admin/apikeys');
});

router.get('/audits', adminAuth, async (req, res) => {
  const audits = (await Audit.find({})).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.render('audits', { audits });
});

router.get('/audits/new', adminAuth, (req, res) => {
  res.render('new_audit', { error: null });
});

router.post('/audits/new', adminAuth, async (req, res) => {
  try {
    const { aiSystem, startDate, endDate, scheduledAt } = req.body;
    const criteria = {};
    if (aiSystem) criteria.aiSystem = aiSystem;
    if (startDate) criteria.startDate = startDate;
    if (endDate) criteria.endDate = endDate;
    
    const audit = await Audit.insert({
      criteria,
      scheduledAt: new Date(scheduledAt),
      status: 'scheduled',
      createdAt: new Date()
    });
    
    schedule.scheduleJob(audit.id, new Date(scheduledAt), async () => {
      try {
        let filter = {};
        if (criteria.aiSystem) filter.aiSystem = criteria.aiSystem;
        const logs = await Log.find(filter);
        const { analyzeLogs } = await import('../helpers/auditAnalysis.js');
        const analysisResult = await analyzeLogs(logs);
        await Audit.update(audit.id, {
          logs: logs.map(l => l.id),
          analysis: analysisResult,
          executedAt: new Date(),
          status: 'completed'
        });
      } catch (err) {
        await Audit.update(audit.id, { status: 'failed' });
        console.error("Audit execution failed:", err);
      }
    });
    res.redirect('/admin/audits');
  } catch (error) {
    res.render('new_audit', { error: error.message });
  }
});

router.get('/settings', adminAuth, async (req, res) => {
  let settings = await getSettings();
  if (!settings) {
    settings = await setSettings({
      siteTitle: 'AuditBot 3000',
      siteBackground: '#ffffff',
      topbarColor: '#2a3f54',
      openAIKey: "",
      azureOpenAIUrl: "",
      azureOpenAIKey: "",
      registrationEnabled: true,
      azureBlobConnectionString: ""
    });
  }
  const appConfig = loadConfig();
  res.render('settings', { settings, appConfig });
});

router.post('/settings', adminAuth, async (req, res) => {
  const { siteTitle, siteBackground, topbarColor, openAIKey, azureOpenAIUrl, azureOpenAIKey, registrationEnabled, azureBlobConnectionString, appPort, sessionSecret, mongoUri } = req.body;
  await setSettings({
    siteTitle,
    siteBackground,
    topbarColor,
    openAIKey,
    azureOpenAIUrl,
    azureOpenAIKey,
    registrationEnabled: registrationEnabled === 'on',
    azureBlobConnectionString
  });
  const newConfig = {
    port: Number(appPort) || 3000,
    sessionSecret: sessionSecret || "default_secret",
    mongoUri: mongoUri || "mongodb://localhost/ai_audit_logger"
  };
  saveConfig(newConfig);
  res.redirect('/admin/settings');
});

router.get('/logout', adminAuth, (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

export default router;
