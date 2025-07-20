const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

const logFormat = format.printf(({ timestamp, level, message, ...meta }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      zippedArchive: true
    }),
    new transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      zippedArchive: true
    })
  ],
  exitOnError: false,
});

module.exports = logger; 