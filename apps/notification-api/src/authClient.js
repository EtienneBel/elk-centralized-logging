const http = require('http');
const logger = require('./logger');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8080';

function validate(userId, correlationId) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${AUTH_SERVICE_URL}/validate`);
    url.searchParams.set('userId', userId);

    const req = http.get(
      url.toString(),
      { headers: { 'X-Correlation-ID': correlationId }, timeout: 5000 },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('error', reject);
        res.on('end', () => {
          try {
            resolve({ ok: res.statusCode === 200, status: res.statusCode, data: JSON.parse(body) });
          } catch (err) {
            logger.warn('Failed to parse auth-service response', { correlationId, error: err.message });
            resolve({ ok: res.statusCode === 200, status: res.statusCode, data: {} });
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Auth service request timed out'));
    });

    req.on('error', reject);
  });
}

module.exports = { validate };
