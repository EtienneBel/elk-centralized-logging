const http   = require('http');
const logger = require('./logger');

const FRAUD_SERVICE_URL = process.env.FRAUD_SERVICE_URL || 'http://fraud-service:8080';

function check(accountId, amount, correlationId) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify({ accountId, amount });
    const parsed  = new URL(FRAUD_SERVICE_URL);
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || 8080,
      path:     '/check',
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

    req.on('timeout', () => { req.destroy(); reject(new Error('Fraud service timed out')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { check };
