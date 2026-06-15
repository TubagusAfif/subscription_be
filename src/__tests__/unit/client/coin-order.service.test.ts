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

  const mockMegaBankPaymentService = {
    createInquiry: jest.fn(),
    getPaymentStatus: jest.fn(),
    verifyWebhookSignature: jest.fn(),
    generateValidateSignature: jest.fn(),
    isPaymentSuccess: jest.fn(),
    isPaymentFailure: jest.fn(),
    isInquiryPaid: jest.fn(),
  };

  const mockTx = {
    coinOrder: { update: jest.fn(), findUnique: jest.fn() },
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
      megaBankPaymentService: mockMegaBankPaymentService as any,
      prisma: mockPrisma as any,
    });
  });

  describe('prepareBundleOrder', () => {
    it('should throw BUNDLE_NOT_FOUND if bundle does not exist', async () => {
      mockBundleRepo.findById.mockResolvedValue(null);

      await expect(
        coinOrderService.prepareBundleOrder(1, 999),
      ).rejects.toThrow(AppError);

      await expect(
        coinOrderService.prepareBundleOrder(1, 999),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Coin bundle with ID 999 not found.' });
    });

    it('should prepare an order and calculate price and tax correctly', async () => {
      const mockBundle = {
        id: 1,
        bundle_name: '100 Coins',
        coin_amount: 100,
        currency_id: 1,
        price: '100000',
        discounted_price: '90000',
        tax_rate: '11',
      };

      const expectedTaxAmount = 90000 * 0.11;
      const expectedTotalPrice = 90000 + expectedTaxAmount; // 99900

      mockBundleRepo.findById.mockResolvedValue(mockBundle);

      const result = await coinOrderService.prepareBundleOrder(1, 1);

      expect(mockBundleRepo.findById).toHaveBeenCalledWith(1);
      expect(result.bundle).toEqual(mockBundle);
      expect(result.taxAmount).toBe(expectedTaxAmount);
      expect(result.totalPrice).toBe(expectedTotalPrice);
      expect(result.pgOrderId).toContain('COIN-1-');
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should throw ORDER_NOT_FOUND if order does not exist', async () => {
      mockCoinOrderRepo.findByPgOrderId.mockResolvedValue(null);

      await expect(coinOrderService.handlePaymentSuccess('invalid-id')).rejects.toThrow(AppError);
    });

    it('should skip if order is already PAID', async () => {
      mockCoinOrderRepo.findByPgOrderId.mockResolvedValue({ id: 10, status: 'PAID' });
      mockTx.coinOrder.findUnique.mockResolvedValue({ id: 10, status: 'PAID' });

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
      mockTx.coinOrder.findUnique.mockResolvedValue(mockOrder);
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
