import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const HASH_PREFIX = 'scrypt-v1';

function derive(password: string, salt: Buffer, cost = SCRYPT_COST, blockSize = SCRYPT_BLOCK_SIZE, parallelization = SCRYPT_PARALLELIZATION) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: cost, r: blockSize, p: parallelization, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPassword(value: string) {
  return value.length >= 8 && value.length <= 128;
}

export function isValidDisplayName(value: string) {
  return value.length >= 2 && value.length <= 80;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return [HASH_PREFIX, SCRYPT_COST, SCRYPT_BLOCK_SIZE, SCRYPT_PARALLELIZATION, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, encoded: string) {
  const [prefix, costValue, blockSizeValue, parallelizationValue, saltValue, keyValue, extra] = encoded.split('$');
  if (prefix !== HASH_PREFIX || !costValue || !blockSizeValue || !parallelizationValue || !saltValue || !keyValue || extra) return false;
  const cost = Number(costValue), blockSize = Number(blockSizeValue), parallelization = Number(parallelizationValue);
  if (cost !== SCRYPT_COST || blockSize !== SCRYPT_BLOCK_SIZE || parallelization !== SCRYPT_PARALLELIZATION) return false;
  try {
    const expected = Buffer.from(keyValue, 'base64url');
    if (expected.length !== KEY_LENGTH) return false;
    const actual = await derive(password, Buffer.from(saltValue, 'base64url'), cost, blockSize, parallelization);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
