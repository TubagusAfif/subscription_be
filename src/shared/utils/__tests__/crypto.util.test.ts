import crypto from 'crypto';
import {
  formatPrivateKey,
  sha256Hex,
  hmacSha512Hex,
  rsaSha256Sign,
  timingSafeHexEqual,
  md5Hex,
} from '../crypto.util';

describe('Crypto Utility', () => {
  describe('formatPrivateKey', () => {
    it('should format raw key into PEM', () => {
      const raw = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ';
      const formatted = formatPrivateKey(raw);
      expect(formatted).toContain('-----BEGIN PRIVATE KEY-----');
      expect(formatted).toContain('-----END PRIVATE KEY-----');
    });
  });

  describe('sha256Hex', () => {
    it('should return correct SHA-256 hash in hex format', () => {
      const input = 'hello world';
      const expected = crypto.createHash('sha256').update(input).digest('hex').toLowerCase();
      expect(sha256Hex(input)).toBe(expected);
    });
  });

  describe('hmacSha512Hex', () => {
    it('should return correct HMAC-SHA512 hash in hex format', () => {
      const input = 'hello world';
      const secret = 'secret_key';
      const expected = crypto.createHmac('sha512', secret).update(input).digest('hex');
      expect(hmacSha512Hex(input, secret)).toBe(expected);
    });
  });

  describe('rsaSha256Sign', () => {
    it('should produce a verifiable RSA signature', () => {
      // Generate a quick RSA keypair for testing
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const data = 'sign this data';
      const signature = rsaSha256Sign(data, privateKey);

      // Verify the signature
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();
      const isVerified = verify.verify(publicKey, Buffer.from(signature, 'base64'));
      expect(isVerified).toBe(true);
    });
  });

  describe('timingSafeHexEqual', () => {
    it('should return true for matching hex strings', () => {
      expect(timingSafeHexEqual('abcdef1234', 'abcdef1234')).toBe(true);
    });

    it('should return false for different hex strings', () => {
      expect(timingSafeHexEqual('abcdef1234', 'abcdef1235')).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      expect(timingSafeHexEqual('abcdef1234', 'abcdef')).toBe(false);
    });
  });

  describe('md5Hex', () => {
    it('should return correct MD5 hash in hex format', () => {
      const input = 'hello world';
      const expected = crypto.createHash('md5').update(input).digest('hex').toLowerCase();
      expect(md5Hex(input)).toBe(expected);
    });
  });
});
