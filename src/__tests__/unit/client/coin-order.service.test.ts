import { CoinOrderService } from '../../../client/services/coin-order.service';
import { AppError } from '../../../shared/middlewares/error.middleware';
import crypto from 'crypto';

describe('CoinOrderService', () => {
  let coinOrderService: CoinOrderService;

  // Mocks
  const mockCoinOrderRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByPgOrderId: jest.fn(),
    findByPgResponseId: jest.fn(),
    findByUserId: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockCoinWalletRepo = {
    findByUserId: jest.fn(),
    create: jest.fn(),
    addBalance: jest.fn(),
    deductBalance: jest.fn(),
  };

  const mockCoinTransactionRepo = {
    create: jest.fn(),
    findByUserId: jest.fn(),
  };

  const mockBundleRepo = {
    findById: jest.fn(),
  };

  const mockMpgService = {
    createInquiry: jest.fn(),
    getPaymentStatus: jest.fn(),
    verifyWebhookSignature: jest.fn(),
    generateValidateSignature: jest.fn(),
    isPaymentSuccess: jest.fn(),
    isPaymentFailure: jest.fn(),
    isInquiryPaid: jest.fn(),
  };

  const mockTx = {
    coinOrder: { update: jest.fn() },
    coinWallet: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    coinTransaction: { create: jest.fn() },
  };

  const mockPrisma = {
    $transaction: jest.fn(async (callback) => {
      return callback(mockTx);
    }),
    coinOrder: { update: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    coinOrderService = new CoinOrderService({
      coinOrderRepository: mockCoinOrderRepo as any,
      coinWalletRepository: mockCoinWalletRepo as any,
      coinTransactionRepository: mockCoinTransactionRepo as any,
      bundleRepository: mockBundleRepo as any,
      mpgService: mockMpgService as any,
      prisma: mockPrisma as any,
    });
  });

  describe('createOrder', () => {
    it('should throw BUNDLE_NOT_FOUND if bundle does not exist', async () => {
      mockBundleRepo.findById.mockResolvedValue(null);

      await expect(
        coinOrderService.createOrder(1, 999, { id: 1, name: 'Test', email: 'test@example.com' }),
      ).rejects.toThrow(AppError);

      await expect(
        coinOrderService.createOrder(1, 999, { id: 1, name: 'Test', email: 'test@example.com' }),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Coin bundle with ID 999 not found.' });
    });

    it('should create an order and an MPG payment inquiry successfully', async () => {
      const mockBundle = {
        id: 1,
        bundle_name: '100 Coins',
        coin_amount: 100,
        currency_id: 1,
        price: '100000',
        discounted_price: '90000',
        tax_rate: '11',
      };

      const expectedTotalPrice = 90000 + 90000 * 0.11; // 99900

      mockBundleRepo.findById.mockResolvedValue(mockBundle);
      mockCoinOrderRepo.create.mockResolvedValue({ id: 101, status: 'PENDING' });
      mockMpgService.createInquiry.mockResolvedValue({
        id: 'mpg-response-123',
        checkoutUrl: 'https://pgcheckoutdev.bankmega.com/test123',
        selectionUrl: 'https://pgcheckoutdev.bankmega.com/test123',
        accountRef: '889089999584102',
        status: 'unpaid',
        responseCode: '0',
        responseDesc: 'Success',
      });
      mockPrisma.coinOrder.update.mockResolvedValue({ id: 101, status: 'PENDING' });

      const result = await coinOrderService.createOrder(1, 1, {
        id: 1,
        name: 'Test',
        email: 'test@example.com',
      });

      expect(mockCoinOrderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 1,
          bundle_id: 1,
          coin_amount: 100,
          price_paid: expectedTotalPrice,
          status: 'PENDING',
        }),
      );

      expect(mockMpgService.createInquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expectedTotalPrice,
          currency: 'IDR',
          paymentSource: 'va',
        }),
      );

      expect(result.checkout_url).toContain('https://pgcheckoutdev.bankmega.com');
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should throw ORDER_NOT_FOUND if order does not exist', async () => {
      mockCoinOrderRepo.findByPgOrderId.mockResolvedValue(null);

      await expect(coinOrderService.handlePaymentSuccess('invalid-id')).rejects.toThrow(AppError);
    });

    it('should skip if order is already PAID', async () => {
      mockCoinOrderRepo.findByPgOrderId.mockResolvedValue({ status: 'PAID' });

      await coinOrderService.handlePaymentSuccess('already-paid-id');

      expect(mockTx.coinWallet.update).not.toHaveBeenCalled();
    });

    it('should credit wallet and create transaction for successful payment', async () => {
      const mockOrder = {
        id: 201,
        user_id: 1,
        currency_id: 1,
        coin_amount: 100,
        status: 'PENDING',
      };
      const mockWallet = { id: 11, user_id: 1, balance: 50 };

      mockCoinOrderRepo.findByPgOrderId.mockResolvedValue(mockOrder);
      mockTx.coinWallet.findUnique.mockResolvedValue(mockWallet);

      await coinOrderService.handlePaymentSuccess('valid-pg-order-id');

      expect(mockTx.coinOrder.update).toHaveBeenCalledWith({
        where: { id: 201 },
        data: { status: 'PAID' },
      });
      expect(mockTx.coinWallet.update).toHaveBeenCalledWith({
        where: { user_id: 1 },
        data: {
          balance: { increment: 100 },
          last_updated: expect.any(Date),
        },
      });
      expect(mockTx.coinTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            wallet_id: 11,
            user_id: 1,
            type: 'TOPUP',
            amount: 100,
          }),
        })
      );
    });
  });
});
