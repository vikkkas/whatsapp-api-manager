import winston from 'winston';
export declare const logger: winston.Logger;
export declare const httpLogStream: {
    write: (message: string) => void;
};
export declare const log: {
    info: (message: string, meta?: Record<string, any>) => void;
    error: (message: string, meta?: Record<string, any>) => void;
    warn: (message: string, meta?: Record<string, any>) => void;
    debug: (message: string, meta?: Record<string, any>) => void;
    http: (message: string, meta?: Record<string, any>) => void;
    webhook: (message: string, meta?: Record<string, any>) => void;
    message: (message: string, meta?: Record<string, any>) => void;
    auth: (message: string, meta?: Record<string, any>) => void;
    queue: (message: string, meta?: Record<string, any>) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map