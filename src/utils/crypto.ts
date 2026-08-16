/**
 * Cryptographic utilities using native WebCrypto API in Cloudflare Workers.
 */

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_ALGORITHM = 'SHA-256';
const SALT_BYTES = 16;
const KEY_BYTES = 32;

/**
 * Converts ArrayBuffer/Uint8Array to hex string.
 */
export function bufToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts hex string to Uint8Array.
 */
export function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Constant-time string equality to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Hash a password using WebCrypto PBKDF2 with SHA-256 and random 16-byte salt.
 * Output format: pbkdf2:sha256:100000:<salt_hex>:<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_ALGORITHM,
    },
    passwordKey,
    KEY_BYTES * 8
  );

  const saltHex = bufToHex(salt);
  const hashHex = bufToHex(derivedBits);

  return `pbkdf2:${PBKDF2_ALGORITHM.toLowerCase()}:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Verify a plaintext password against a stored PBKDF2 hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  const parts = storedHash.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const [, hashAlgo, iterationsStr, saltHex, originalHashHex] = parts;
  const iterations = parseInt(iterationsStr, 10);
  if (isNaN(iterations) || iterations <= 0) return false;

  const salt = hexToBuf(saltHex);
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: hashAlgo.toUpperCase(),
    },
    passwordKey,
    KEY_BYTES * 8
  );

  const calculatedHashHex = bufToHex(derivedBits);
  return timingSafeEqual(calculatedHashHex, originalHashHex);
}

/**
 * Generate a cryptographically secure random token (hex string).
 */
export function generateSecureToken(byteLength = 24): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bufToHex(bytes);
}

/**
 * Generate a cryptographically secure random slug for public notes.
 * Default: 7 lowercase alphanumeric characters.
 */
export function generateSecureSlug(length = 7): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * Sign data using HMAC SHA-256 for secure session cookies.
 */
export async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return bufToHex(signature);
}

/**
 * Verify HMAC SHA-256 signature for session cookies.
 */
export async function hmacVerify(data: string, signatureHex: string, secret: string): Promise<boolean> {
  const expectedSig = await hmacSign(data, secret);
  return timingSafeEqual(expectedSig, signatureHex);
}
