import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'crypto';

function scrypt(secret: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(secret, salt, keylen, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Hache un secret court (code SMS, PIN) avec scrypt et un sel aléatoire. */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(secret, salt, 32);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** Compare en temps constant un secret avec son empreinte. */
export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const [alg, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(secret, Buffer.from(salt, 'base64'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

export const randomDigits = (length: number): string =>
  Array.from({ length }, () => randomInt(0, 10)).join('');
