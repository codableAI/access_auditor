// routes/api.js
import express from 'express';
import bcrypt from 'bcrypt';
import schedule from 'node-schedule';
import { insert as insertLog, find as findLog } from '../models/Log.js';
import { findOne as apiKeyFindOne, insert as insertApiKey, remove as removeApiKey } from '../models/ApiKey.js';
import { insert as insertAudit, update as updateAudit, find as findAudit } from '../models/Audit.js';
import { storeDataToBlob } from '../helpers/azureBlobStorage.js';
import { analyzeLogs } from '../helpers/auditAnalysis.js';

const router = express.Router();

async function authenticate(req, res, next) {
  const keyId = req.headers['x-api-key-id'];
  const apiKey = req.headers['x-api-key'];
  if (!keyId || !apiKey) {
    return res.status(401).json({ error: 'API key id and API key required' });
  }
  const keyRecord = await apiKeyFindOne({ keyId });
  if (!keyRecord) {
    return res.status(401).json({ error: 'Invalid API key id' });
  }
  const match = await bcrypt.compare(apiKey, keyRecord.hashedKey);
  if (!match) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  if (keyRecord.expiration && new Date() > new Date(keyRecord.expiration)) {
    return res.status(401).json({ error: 'API key expired' });
  }
  req.apiKeyRecord = keyRecord;
  next();
}

router.post('/log', authenticate, async (req, res) => {
  try {
    const { aiSystem, dataAccessed, purpose, kind, details, userIdentifier } = req.body;
    const dataAccessedArray = Array.isArray(dataAccessed) ? dataAccessed : [dataAccessed];
    const purposeArray = Array.isArray(purpose) ? purpose : [purpose];
    const log = await insertLog({
      aiSystem,
      dataAccessed: dataAccessedArray,
      purpose: purposeArray,
      kind,
      details,
      userIdentifier,
      timestamp: new Date()
    });
    storeDataToBlob('logs', `${log.id}.json`, JSON.stringify(log))
      .catch(err => console.error('Blob storage error (log):', err.message));
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/logs', authenticate, async (req, res) => {
  try {
    const { aiSystem, startDate, endDate, purpose } = req.query;
    let filter = {};
    if (aiSystem) filter.aiSystem = aiSystem;
    if (purpose) filter.purpose = purpose;
    const logs = await findLog(filter);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/apikey', authenticate, async (req, res) => {
  try {
    const { scopes, expiration, rateLimit, owner } = req.body;
    const newApiKeyPlain = require('crypto').randomBytes(16).toString('hex');
    const keyId = require('crypto').randomBytes(8).toString('hex');
    const hashedKey = await bcrypt.hash(newApiKeyPlain, 10);
    const apiKey = await insertApiKey({
      keyId,
      hashedKey,
      scopes: scopes ? scopes.split(',').map(s => s.trim()) : [],
      expiration: expiration ? new Date(expiration) : null,
      rateLimit: rateLimit ? Number(rateLimit) : null,
      owner
    });
    res.json({ success: true, keyId, apiKey: newApiKeyPlain });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/apikey/delete/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    await removeApiKey(id);
    res.redirect('/admin/apikeys');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audits', authenticate, async (req, res) => {
  try {
    const { criteria, scheduledAt } = req.body;
    const audit = await insertAudit({
      criteria: criteria || {},
      scheduledAt: new Date(scheduledAt),
      status: 'scheduled',
      createdAt: new Date()
    });
    schedule.scheduleJob(audit.id, new Date(scheduledAt), async () => {
      try {
        let filter = {};
        if (audit.criteria.aiSystem) filter.aiSystem = audit.criteria.aiSystem;
        const logs = await findLog(filter);
        const analysisResult = await analyzeLogs(logs);
        await updateAudit(audit.id, {
          logs: logs.map(l => l.id),
          analysis: analysisResult,
          executedAt: new Date(),
          status: 'completed'
        });
        storeDataToBlob('audits', `${audit.id}.json`, JSON.stringify(audit))
          .catch(err => console.error('Blob storage error (audit):', err.message));
      } catch (err) {
        await updateAudit(audit.id, { status: 'failed' });
        console.error("Audit execution failed:", err);
      }
    });
    res.json({ success: true, audit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audits', authenticate, async (req, res) => {
  try {
    const audits = await findAudit({});
    res.json({ success: true, audits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
