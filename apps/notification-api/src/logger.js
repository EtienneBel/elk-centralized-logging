const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const APP_NAME = process.env.APP_NAME || 'nodejs-app';
const ENVIRONMENT = process.env.NODE_ENV || 'production';
const LOG_DIR = process.env.LOG_DIR || '/app/logs';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    application: APP_NAME,
    environment: ENVIRONMENT,
    service: 'nodejs',
  },
  transports: [
    // Human-readable for Docker logs / local dev
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? JSON.stringify(meta)
            : '';
          return `${timestamp} ${level}: ${message} ${metaStr}`;
        })
      ),
    }),

    // Daily rotating archive — JSON for Filebeat (goes to ELK)
    new DailyRotateFile({
      filename: `${LOG_DIR}/app-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '500m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.json()
      ),
    }),
  ],
});

module.exports = logger;
