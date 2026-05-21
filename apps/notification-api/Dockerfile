FROM node:20-alpine
WORKDIR /app
COPY apps/notification-api/package.json ./
RUN npm install --omit=dev
COPY apps/notification-api/src/ ./src/
COPY nodejs/logger.js ./src/logger.js
COPY nodejs/middleware/requestLogger.js ./src/middleware/requestLogger.js
RUN mkdir -p /app/logs
EXPOSE 3000
CMD ["node", "src/index.js"]
