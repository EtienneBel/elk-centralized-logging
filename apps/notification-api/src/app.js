const express = require('express');
const logger = require('./logger');
const requestLogger = require('./middleware/requestLogger');
const authClient = require('./authClient');

const app = express();
app.use(express.json());
app.use(requestLogger);

app.get('/health', (req, res) => {
  logger.info('Health check', { correlationId: req.correlationId });
  res.json({ status: 'ok', service: 'notification-api' });
});

app.post('/notify', async (req, res) => {
  const { userId = 'alice' } = req.body || {};
  const { slow, fail } = req.query;
  const correlationId = req.correlationId;

  if (fail === 'true') {
    logger.error('Forced failure triggered', { correlationId, userId });
    return res.status(500).json({ error: 'Forced failure', correlationId });
  }

  if (slow === 'true') {
    await new Promise((r) => setTimeout(r, 2000));
  }

  logger.info('Notification requested', { correlationId, userId });

  try {
    const result = await authClient.validate(userId, correlationId);

    if (!result.ok) {
      logger.error('Auth service rejected request', { correlationId, userId, authStatus: result.status });
      return res.status(502).json({ error: 'Auth rejected', correlationId });
    }

    if (result.data && result.data.billing === 'suspended') {
      logger.warn('Billing suspended for user', { correlationId, userId });
    }

    logger.info('Notification sent successfully', { correlationId, userId });
    res.json({ success: true, correlationId, userId });
  } catch (err) {
    logger.error('Auth service unreachable', { correlationId, userId, error: err.message });
    res.status(502).json({ error: 'Auth service unreachable', correlationId });
  }
});

module.exports = app;
