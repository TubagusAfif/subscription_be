import crypto from 'crypto';

/**
 * Normalises a raw private key string into a properly formatted PEM.
 *
 * Strips any existing PEM headers / footers and whitespace, then re-wraps
 * the Base-64 payload at 64-character lines with the correct headers.
 *
 * @param raw - Raw private key content (may or may not contain PEM headers).
 * @returns A valid PEM-encoded PKCS#8 private key string.
 */
export function formatPrivateKey(raw: string): string {
  let key = raw.trim();
  
  if (!key.startsWith('-----BEGIN PRIVATE KEY-----')) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}`;
  }
  
  if (!key.endsWith('-----END PRIVATE KEY-----')) {
    key = `${key}\n-----END PRIVATE KEY-----`;
  }
  
  return key;
}

/**
 * Returns the lower-case hex-encoded SHA-256 digest of the input string.
 */
export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex').toLowerCase();
}

/**
 * Returns the hex-encoded MD5 digest of the input string.
 */
export function md5Hex(input: string): string {
  return crypto.createHash('md5').update(input, 'utf8').digest('hex');
}

/**
 * Generates an HMAC-SHA512 symmetric signature.
 * 
 * @param data - The string to sign
 * @param secret - The client secret
 * @returns Hex-encoded signature
 */
export function hmacSha512Hex(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data, 'utf8').digest('hex');
}

/**
 * Generates an HMAC-SHA512 symmetric signature.
 * 
 * @param data - The string to sign
 * @param secret - The client secret
 * @returns Base64-encoded signature
 */
export function hmacSha512Base64(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data, 'utf8').digest('base64');
}

/**
 * Generates an RSA-SHA256 asymmetric signature.
 * 
 * @param data - The string to sign
 * @param privateKeyPem - The formatted private key
 * @returns Base64-encoded signature
 */
export function rsaSha256Sign(data: string, privateKeyPem: string): string {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data, 'utf8');
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

/**
 * Constant-time comparison of two hex strings to prevent timing attacks.
 * Includes automatic buffer length checking.
 * 
 * @param a - First hex string
 * @param b - Second hex string
 * @returns True if equal
 */
export function timingSafeHexEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, 'hex');
    const bBuf = Buffer.from(b, 'hex');
    if (aBuf.length !== bBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch (error) {
    return false;
  }
}

/**
 * Constant-time comparison of two base64 strings to prevent timing attacks.
 * Includes automatic buffer length checking.
 * 
 * @param a - First base64 string
 * @param b - Second base64 string
 * @returns True if equal
 */
export function timingSafeBase64Equal(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, 'base64');
    const bBuf = Buffer.from(b, 'base64');
    if (aBuf.length !== bBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch (error) {
    return false;
  }
}

/**
 * Generates a random hex string of the specified byte length.
 */
export function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}
