import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST before anything else
// In production, dotenv looks in current directory, not dist/
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Validate critical environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
  'ENCRYPTION_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}\n` +
    'Please ensure your .env file is properly configured.'
  );
}

// Export validated env vars with proper types
export const env = {
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  DATABASE_URL: process.env.DATABASE_URL as string,
  REDIS_URL: process.env.REDIS_URL,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY as string,
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL,
  WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN,
  META_API_VERSION: process.env.META_API_VERSION || 'v21.0',
  META_API_BASE_URL: process.env.META_API_BASE_URL || 'https://graph.facebook.com',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  ENABLE_REDIS: process.env.ENABLE_REDIS === 'true',
  ENABLE_QUEUES: process.env.ENABLE_QUEUES === 'true',
} as const;

export default env;
