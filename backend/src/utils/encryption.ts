import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive encryption key from password using PBKDF2
 */
function getKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt sensitive data (like WABA tokens)
 * In production, use AWS KMS, Google Cloud KMS, or HashiCorp Vault
 */
export function encrypt(text: string): string {
  const password = env.ENCRYPTION_KEY;
  
  if (!password || password.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Return: salt + iv + tag + encrypted (all hex encoded)
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  const password = env.ENCRYPTION_KEY;
  
  if (!password || password.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }

  const parts = encryptedData.split(':');
  
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }
  
  const salt = Buffer.from(parts[0], 'hex');
  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const encrypted = parts[3];
  
  const key = getKey(password, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash passwords (for AdminUser)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export default {
  encrypt,
  decrypt,
  hashPassword,
  comparePassword,
};
