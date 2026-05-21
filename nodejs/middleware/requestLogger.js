const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

/**
 * Tiered request logging middleware.
 *
 * Automatically detects and logs:
 * - Extremely slow requests (>5s) → ERROR
 * - Slow requests (>1s)           → WARN
 * - Server errors (5xx)           → ERROR
 * - Client errors (4xx)           → WARN
 * - Normal requests               → INFO
 *
 * Propagates X-Correlation-ID across services so a single
 * Kibana query can trace a request through the full stack.
 */
function requestLogger(req, res, next) {
  const correlationId =
    req.headers['x-correlation-id'] || uuidv4().substring(0, 8);

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration_ms: duration,
      clientIp: req.headers['x-forwarded-for'] || req.ip,
      userId: req.user?.id || null,
    };

    if (duration > 5000) {
      logger.error('Extremely slow request', logData);
    } else if (duration > 1000) {
      logger.warn('Slow request detected', logData);
    } else if (res.statusCode >= 500) {
      logger.error('Server error response', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Client error response', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}

module.exports = requestLogger;
