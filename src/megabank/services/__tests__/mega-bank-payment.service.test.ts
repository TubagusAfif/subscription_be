import { MegaBankPaymentService } from '../mega-bank-payment.service';
import * as httpUtil from '../../../shared/utils/http.util';
import { MegaBankTokenUtil } from '../../utils/mega-bank-token.util';

// Mock httpUtil and cryptoUtil
jest.mock('../../../shared/utils/http.util');
jest.mock('../../../shared/utils/crypto.util', () => ({
  ...jest.requireActual('../../../shared/utils/crypto.util'),
  rsaSha256Sign: jest.fn().mockReturnValue('mocked_rsa_signature'),
}));

describe('MegaBankPaymentService', () => {
  let service: MegaBankPaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MegaBankPaymentService();
  });

  describe('getAccessToken', () => {
    it('should fetch a new token when cache is empty', async () => {
      (httpUtil.fetchWithTimeout as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: 'new_token', expiresIn: 300 }),
      });

      const token = await MegaBankTokenUtil.getAccessToken();
      expect(token).toBe('new_token');
      expect(httpUtil.fetchWithTimeout).toHaveBeenCalledTimes(1);
    });

    it('should return cached token if within TTL', async () => {
      // Force cache token
      (MegaBankTokenUtil as any).cachedToken = {
        accessToken: 'cached_token',
        expiresAt: Date.now() + 100000,
      };

      const token = await MegaBankTokenUtil.getAccessToken();
      expect(token).toBe('cached_token');
      expect(httpUtil.fetchWithTimeout).not.toHaveBeenCalled();
    });

    it('should invalidate token cache and fetch new token', async () => {
      (MegaBankTokenUtil as any).cachedToken = {
        accessToken: 'cached_token',
        expiresAt: Date.now() + 100000,
      };

      (httpUtil.fetchWithTimeout as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: 'fresh_token', expiresIn: 300 }),
      });

      service.invalidateTokenCache();
      const token = await MegaBankTokenUtil.getAccessToken();
      expect(token).toBe('fresh_token');
      expect(httpUtil.fetchWithTimeout).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should reject timestamps older than 5 minutes', () => {
      const oldTimestamp = new Date(Date.now() - 6 * 60 * 1000).toISOString();
      const signatureHeader = `dummy_sig;${oldTimestamp}`;
      const result = service.verifyWebhookSignature('{}', signatureHeader);
      expect(result).toBe(false);
    });

    it('should reject tampered payloads', () => {
      const timestamp = new Date().toISOString();
      const signatureHeader = `invalid_sig;${timestamp}`;
      const result = service.verifyWebhookSignature('{"amount":100}', signatureHeader);
      expect(result).toBe(false);
    });
  });
});
