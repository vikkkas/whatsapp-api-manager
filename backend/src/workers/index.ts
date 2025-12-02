import dotenv from 'dotenv';
import { log } from '../utils/logger.js';
import webhookWorker from './webhook-processor.js';
import messageSendWorker from './message-sender.js';
import flowExecutorWorker from './flow-executor.js';

// Load environment variables
dotenv.config();

log.info('🔧 Starting workers...');
log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  log.info(`${signal} received, shutting down workers...`);

  try {
    await Promise.all([
      webhookWorker.close(),
      messageSendWorker.close(),
      flowExecutorWorker.close(),
    ]);

    log.info('Workers shut down successfully');
    process.exit(0);
  } catch (error: any) {
    log.error('Error during worker shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled errors
process.on('unhandledRejection', (reason: any) => {
  log.error('Unhandled Rejection in worker', { reason });
});

process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught Exception in worker', { error: error.message, stack: error.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

log.info('✅ Workers started successfully');
log.info('📬 Webhook processor: Ready');
log.info('📤 Message sender: Ready');
log.info('🤖 Flow executor: Ready');
