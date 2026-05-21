const express       = require('express');
const logger        = require('./logger');
const requestLogger = require('./middleware/requestLogger');
const fraudClient   = require('./fraudClient');
const accountClient = require('./accountClient');

const app = express();
app.use(express.json());
app.use(requestLogger);

app.get('/health', (req, res) => {
  logger.info('Health check', { correlationId: req.correlationId });
  res.json({ status: 'ok', service: 'transaction-api' });
});

app.post('/transfer', async (req, res) => {
  const { from, to, amount } = req.body || {};
  const correlationId = req.correlationId;

  if (!from || !to || amount == null || typeof amount !== 'number' || amount <= 0) {
    logger.warn('Invalid transfer input', { correlationId, from, to, amount });
    return res.status(400).json({ error: 'Invalid input: from, to, and positive amount required', correlationId });
  }

  logger.info('Transfer initiated', { correlationId, from, to, amount });

  try {
    const fraud = await fraudClient.check(from, amount, correlationId);

    if (fraud.status === 403) {
      logger.error('Transfer blocked by fraud check', {
        correlationId, from, to, amount,
        reason: fraud.data.reason,
        score:  fraud.data.score,
      });
      return res.status(403).json({
        error: 'Transfer blocked',
        correlationId,
        reason: fraud.data.reason,
      });
    }

    if (fraud.status !== 200) {
      logger.error('Fraud service returned unexpected error', {
        correlationId, from, to, amount, status: fraud.status,
      });
      return res.status(502).json({ error: 'Fraud service error', correlationId });
    }

    if (fraud.data.score >= 75) {
      logger.warn('Large amount flagged', { correlationId, from, amount, score: fraud.data.score });
    }

    const account = await accountClient.execute(from, to, amount, correlationId);

    if (account.status === 402) {
      logger.error('Insufficient funds', { correlationId, from, amount });
      return res.status(402).json({ error: 'Insufficient funds', correlationId });
    }

    if (account.status === 404) {
      logger.error('Account not found', { correlationId, from, to });
      return res.status(404).json({ error: 'Account not found', correlationId });
    }

    if (account.status !== 200) {
      logger.error('Account service error', { correlationId, status: account.status });
      return res.status(502).json({ error: 'Account service error', correlationId });
    }

    logger.info('Transfer completed', {
      correlationId,
      from, to, amount,
      fraudScore:  fraud.data.score,
      fromBalance: account.data.fromBalance,
      toBalance:   account.data.toBalance,
    });

    res.json({
      success:     true,
      correlationId,
      fromBalance: account.data.fromBalance,
      toBalance:   account.data.toBalance,
    });

  } catch (err) {
    logger.error('Transfer failed — service unreachable', {
      correlationId, from, to, amount, error: err.message,
    });
    res.status(502).json({ error: 'Service unavailable', correlationId });
  }
});

module.exports = app;
