/**
 * Encryption Service
 * Encrypts/Decrypts sensitive data like Aadhar, Bank Account Numbers, etc.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32-chars-long!', 'utf8').slice(0, 32);

/**
 * Encrypt sensitive data
 * Format: iv:encrypted
 */
export function encryptData(data: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Mask sensitive data for logging
 */
export function maskAadhar(aadhar: string): string {
  return `****${aadhar.slice(-4)}`;
}

export function maskAccountNumber(accountNumber: string): string {
  return `****${accountNumber.slice(-4)}`;
}

export function maskPhone(phone: string): string {
  return `****${phone.slice(-4)}`;
}
