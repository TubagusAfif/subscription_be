import { MidtransPaymentService } from '../midtrans-payment.service';
import { sha512Hex } from '../../../shared/utils/crypto.util';
import type { MidtransNotification } from '../../types/midtrans.types';
import type { CreateCheckoutParams } from '../../../shared/payment/payment-gateway.interface';

// Capture the parameter handed to Snap so we can assert enabled_payments.
const mockCreateTransaction = jest.fn().mockResolvedValue({
  token: 'snap-token',
  redirect_url: 'https://app.sandbox.midtrans.com/snap/v4/redirection/snap-token',
});

jest.mock('midtrans-client', () => ({
  __esModule: true,
  default: {
    Snap: jest.fn().mockImplementation(() => ({ createTransaction: mockCreateTransaction })),
  },
}));

// MIDTRANS_SERVER_KEY is injected by src/__tests__/setup.ts
const SERVER_KEY = 'SB-Mid-server-test-key';

const checkoutParams = (overrides: Partial<CreateCheckoutParams> = {}): CreateCheckoutParams => ({
  pgOrderId: 'COIN-1-123',
  amount: 110770,
  currency: 'IDR',
  referenceUrl: 'https://example.test/status?order_id=COIN-1-123',
  customer: { name: 'Test User', email: 'user@example.test', phoneNumber: '0800000000' },
  itemName: 'Coin purchase',
  ...overrides,
});

const baseNotification = (overrides: Partial<MidtransNotification> = {}): MidtransNotification => {
  const order_id = overrides.order_id ?? 'COIN-1-123';
  const status_code = overrides.status_code ?? '200';
  const gross_amount = overrides.gross_amount ?? '100000.00';
  return {
    order_id,
    status_code,
    gross_amount,
    transaction_status: overrides.transaction_status ?? 'settlement',
    fraud_status: overrides.fraud_status,
    // Valid signature unless explicitly overridden
    signature_key:
      overrides.signature_key ??
      sha512Hex(order_id + status_code + gross_amount + SERVER_KEY),
  };
};

describe('MidtransPaymentService', () => {
  let service: MidtransPaymentService;

  beforeEach(() => {
    service = new MidtransPaymentService();
    mockCreateTransaction.mockClear();
  });

  describe('createCheckout enabled_payments (locks Snap to the chosen method)', () => {
    const paramFor = async (paymentSource?: string) => {
      await service.createCheckout(checkoutParams({ paymentSource }));
      return mockCreateTransaction.mock.calls[0][0];
    };

    it('locks QRIS (megaqris) to the qris channel', async () => {
      expect((await paramFor('megaqris')).enabled_payments).toEqual(['qris']);
    });

    it('locks Virtual Account to the bank VA channels only', async () => {
      const enabled = (await paramFor('va')).enabled_payments;
      expect(enabled).toContain('bca_va');
      expect(enabled).not.toContain('qris');
      expect(enabled).not.toContain('credit_card');
    });

    it('is case-insensitive on the payment method code', async () => {
      expect((await paramFor('MEGAQRIS')).enabled_payments).toEqual(['qris']);
    });

    it('omits enabled_payments for an unknown code (falls back to full menu)', async () => {
      expect((await paramFor('foobar')).enabled_payments).toBeUndefined();
    });

    it('omits enabled_payments when no method is provided', async () => {
      expect((await paramFor(undefined)).enabled_payments).toBeUndefined();
    });

    it('sets gross_amount to the (fee-inclusive) amount passed in', async () => {
      const param = await paramFor('megaqris');
      expect(param.transaction_details.gross_amount).toBe(110770);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('accepts a correctly signed notification', () => {
      expect(service.verifyWebhookSignature(baseNotification())).toBe(true);
    });

    it('rejects a tampered gross_amount (signature no longer matches)', () => {
      const n = baseNotification();
      n.gross_amount = '1.00'; // tamper after signing
      expect(service.verifyWebhookSignature(n)).toBe(false);
    });

    it('rejects a forged signature_key', () => {
      expect(
        service.verifyWebhookSignature(baseNotification({ signature_key: 'deadbeef' })),
      ).toBe(false);
    });

    it('rejects a missing signature_key', () => {
      expect(
        service.verifyWebhookSignature(baseNotification({ signature_key: '' })),
      ).toBe(false);
    });
  });

  describe('status classification', () => {
    it('treats settlement as success', () => {
      expect(service.isPaymentSuccess(baseNotification({ transaction_status: 'settlement' }))).toBe(true);
    });

    it('treats capture as success only when fraud_status is accept', () => {
      expect(
        service.isPaymentSuccess(
          baseNotification({ transaction_status: 'capture', fraud_status: 'accept' }),
        ),
      ).toBe(true);
      expect(
        service.isPaymentSuccess(
          baseNotification({ transaction_status: 'capture', fraud_status: 'challenge' }),
        ),
      ).toBe(false);
    });

    it('treats pending as neither success nor failure', () => {
      const n = baseNotification({ transaction_status: 'pending' });
      expect(service.isPaymentSuccess(n)).toBe(false);
      expect(service.isPaymentFailure(n)).toBe(false);
    });

    it.each(['deny', 'cancel', 'expire', 'failure'])('treats %s as failure', (status) => {
      expect(service.isPaymentFailure(baseNotification({ transaction_status: status }))).toBe(true);
    });
  });
});
