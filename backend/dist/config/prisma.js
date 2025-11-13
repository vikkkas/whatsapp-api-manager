import { PrismaClient } from '@prisma/client';
import winston from 'winston';
const prismaClientSingleton = () => {
    return new PrismaClient({
        log: [
            {
                emit: 'event',
                level: 'query',
            },
            {
                emit: 'event',
                level: 'error',
            },
            {
                emit: 'event',
                level: 'info',
            },
            {
                emit: 'event',
                level: 'warn',
            },
        ],
    });
};
const prisma = globalThis.prisma ?? prismaClientSingleton();
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}
process.on('beforeExit', async () => {
    await prisma.$disconnect();
    logger.info('Prisma disconnected');
});
export default prisma;
//# sourceMappingURL=prisma.js.map