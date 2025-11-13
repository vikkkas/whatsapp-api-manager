import winston from 'winston';
const { combine, timestamp, printf, colorize, errors } = winston.format;
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    defaultMeta: { service: 'whatsapp-saas' },
    transports: [
        new winston.transports.Console({
            format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 10,
        }),
    ],
});
export const httpLogStream = {
    write: (message) => {
        logger.http(message.trim());
    },
};
export const log = {
    info: (message, meta) => {
        logger.info(message, meta);
    },
    error: (message, meta) => {
        logger.error(message, meta);
    },
    warn: (message, meta) => {
        logger.warn(message, meta);
    },
    debug: (message, meta) => {
        logger.debug(message, meta);
    },
    http: (message, meta) => {
        logger.http(message, meta);
    },
    webhook: (message, meta) => {
        logger.info(`[WEBHOOK] ${message}`, meta);
    },
    message: (message, meta) => {
        logger.info(`[MESSAGE] ${message}`, meta);
    },
    auth: (message, meta) => {
        logger.info(`[AUTH] ${message}`, meta);
    },
    queue: (message, meta) => {
        logger.info(`[QUEUE] ${message}`, meta);
    },
};
export default logger;
//# sourceMappingURL=logger.js.map