const http   = require('http');
const logger = require('./logger');

const ACCOUNT_SERVICE_URL = process.env.ACCOUNT_SERVICE_URL || 'http://account-service:8000';

function execute(from, to, amount, correlationId) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify({ from, to, amount });
    const parsed  = new URL(ACCOUNT_SERVICE_URL);
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || 8000,
      path:     '/execute',
      method:   'POST',
      headers: {
        'Content-Type':    'application/json',
        'Content-Length':  Buffer.byteLength(body),
        'X-Correlation-ID': correlationId,
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: {} });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const err = new Error('Account service timed out');
      logger.warn('Account service request timed out', { correlationId });
      reject(err);
    });
    req.on('error', (err) => {
      logger.warn('Account service request failed', { correlationId, error: err.message });
      reject(err);
    });
    req.write(body);
    req.end();
  });
}

module.exports = { execute };
