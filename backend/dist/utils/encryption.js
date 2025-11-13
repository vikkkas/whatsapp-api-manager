import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
function getKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}
export function encrypt(text) {
    const password = process.env.ENCRYPTION_KEY;
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
    return salt.toString('hex') + ':' + iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}
export function decrypt(encryptedData) {
    const password = process.env.ENCRYPTION_KEY;
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
export async function hashPassword(password) {
    return bcryptjs.hash(password, 12);
}
export async function comparePassword(password, hash) {
    return bcryptjs.compare(password, hash);
}
export default {
    encrypt,
    decrypt,
    hashPassword,
    comparePassword,
};
//# sourceMappingURL=encryption.js.map