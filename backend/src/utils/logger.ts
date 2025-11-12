import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create Winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  defaultMeta: { service: 'whatsapp-saas' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
});

// Stream for Morgan HTTP logger
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Structured logging helpers
export const log = {
  info: (message: string, meta?: Record<string, any>) => {
    logger.info(message, meta);
  },
  
  error: (message: string, meta?: Record<string, any>) => {
    logger.error(message, meta);
  },
  
  warn: (message: string, meta?: Record<string, any>) => {
    logger.warn(message, meta);
  },
  
  debug: (message: string, meta?: Record<string, any>) => {
    logger.debug(message, meta);
  },
  
  http: (message: string, meta?: Record<string, any>) => {
    logger.http(message, meta);
  },
  
  // Domain-specific loggers
  webhook: (message: string, meta?: Record<string, any>) => {
    logger.info(`[WEBHOOK] ${message}`, meta);
  },
  
  message: (message: string, meta?: Record<string, any>) => {
    logger.info(`[MESSAGE] ${message}`, meta);
  },
  
  auth: (message: string, meta?: Record<string, any>) => {
    logger.info(`[AUTH] ${message}`, meta);
  },
  
  queue: (message: string, meta?: Record<string, any>) => {
    logger.info(`[QUEUE] ${message}`, meta);
  },
};

export default logger;
