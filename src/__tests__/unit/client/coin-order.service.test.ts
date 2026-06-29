import { CoinOrderService } from '../../../client/services/coin-order.service';
import { AppError } from '../../../shared/middlewares/error.middleware';

describe('CoinOrderService', () => {
  let coinOrderService: CoinOrderService;

  const mockCoinOrderRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByPgOrderId: jest.fn(),
    findByUserId: jest.fn(),
    updateStatus: jest.fn(),
    updatePaymentInfo: jest.fn(),
    findPendingByUserId: jest.fn(),
    markFailedIfPending: jest.fn(),
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

  const mockCurrencyRepo = {
    findActive: jest.fn(),
    findById: jest.fn(),
  };

  const mockPaymentMethodRepo = {
    findByCode: jest.fn(),
    findById: jest.fn(),
    findActive: jest.fn(),
  };

  const mockTx = {
    coinOrder: { updateMany: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    coinWallet: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    coinTransaction: { create: jest.fn() },
  };

  const mockPrisma = {
    $transaction: jest.fn(async (callback) => callback(mockTx)),
    coinOrder: { updateMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user has no active pending order.
    mockCoinOrderRepo.findPendingByUserId.mockResolvedValue(null);

    coinOrderService = new CoinOrderService({
      coinOrderRepository: mockCoinOrderRepo as any,
      coinWalletRepository: mockCoinWalletRepo as any,
      coinTransactionRepository: mockCoinTransactionRepo as any,
      bundleRepository: mockBundleRepo as any,
      currencyRepository: mockCurrencyRepo as any,
      paymentMethodRepository: mockPaymentMethodRepo as any,
      prisma: mockPrisma as any,
    });
  });

  describe('assertNoActivePendingOrder (via prepareBundleOrder)', () => {
    it('should throw PENDING_ORDER_EXISTS when a recent pending order exists', async () => {
      mockCoinOrderRepo.findPendingByUserId.mockResolvedValue({
        id: 5,
        created_at: new Date(), // fresh → not stale
      });

      await expect(coinOrderService.prepareBundleOrder(1, 1, 1)).rejects.toMatchObject({
        statusCode: 422,
        code: 'PENDING_ORDER_EXISTS',
      });
      expect(mockBundleRepo.findById).not.toHaveBeenCalled();
    });

    it('should expire a stale pending order and continue', async () => {
      mockCoinOrderRepo.findPendingByUserId.mockResolvedValue({
        id: 5,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h old → stale
      });
      mockBundleRepo.findById.mockResolvedValue(null); // will then 404, that's fine

      await expect(coinOrderService.prepareBundleOrder(1, 999, 1)).rejects.toMatchObject({
        code: 'BUNDLE_NOT_FOUND',
      });
      expect(mockCoinOrderRepo.updateStatus).toHaveBeenCalledWith(5, 'EXPIRED');
    });
  });

  describe('prepareBundleOrder', () => {
    it('should throw BUNDLE_NOT_FOUND if bundle does not exist', async () => {
      mockBundleRepo.findById.mockResolvedValue(null);

      await expect(coinOrderService.prepareBundleOrder(1, 999, 1)).rejects.toThrow(AppError);
      await expect(coinOrderService.prepareBundleOrder(1, 999, 1)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Coin bundle with ID 999 not found.',
      });
    });

    it('should throw INVALID_PAYMENT_METHOD if payment method does not exist or is inactive', async () => {
      mockBundleRepo.findById.mockResolvedValue({ id: 1, price: '100000', tax_rate: '11' });
      mockPaymentMethodRepo.findById.mockResolvedValue(null);

      await expect(coinOrderService.prepareBundleOrder(1, 1, 99)).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_PAYMENT_METHOD',
      });
    });

    it('should calculate price, tax, and a FIXED gateway fee correctly', async () => {
      mockBundleRepo.findById.mockResolvedValue({
        id: 1,
        bundle_name: '100 Coins',
        coin_amount: 100,
        currency_id: 1,
        price: '100000',
        discounted_price: '90000',
        tax_rate: '11',
      });
      mockPaymentMethodRepo.findById.mockResolvedValue({
        id: 1,
        fee_type: 'FIXED',
        fee_value: 4000,
        is_active: true,
      });

      const result = await coinOrderService.prepareBundleOrder(1, 1, 1);

      expect(mockBundleRepo.findById).toHaveBeenCalledWith(1);
      expect(mockPaymentMethodRepo.findById).toHaveBeenCalledWith(1);
      expect(result.basePrice).toBe(90000);
      expect(result.taxAmount).toBe(9900);
      expect(result.gatewayFee).toBe(4000);
      expect(result.totalPrice).toBe(103900);
      expect(result.pgOrderId).toContain('COIN-1-');
    });

    it('should calculate a PERCENTAGE gateway fee correctly', async () => {
      mockBundleRepo.findById.mockResolvedValue({
        id: 1,
        coin_amount: 100,
        currency_id: 1,
        price: '100000',
        discounted_price: '90000',
        tax_rate: '11',
      });
      mockPaymentMethodRepo.findById.mockResolvedValue({
        id: 2,
        fee_type: 'PERCENTAGE',
        fee_value: 2.9,
        is_active: true,
      });

      const result = await coinOrderService.prepareBundleOrder(1, 1, 2);

      const expectedFee = Math.round((90000 + 9900) * 0.029); // 2897
      expect(result.gatewayFee).toBe(expectedFee);
      expect(result.totalPrice).toBe(90000 + 9900 + expectedFee);
    });
  });

  describe('prepareCustomOrder', () => {
    it('should calculate price, tax, and gateway fee for a custom order', async () => {
      mockCurrencyRepo.findActive.mockResolvedValue({ id: 1, conversion_rate: 1000 });
      mockPaymentMethodRepo.findById.mockResolvedValue({
        id: 1,
        fee_type: 'FIXED',
        fee_value: 4000,
        is_active: true,
      });

      const activeTax = { tax_type: 'PERCENTAGE', tax_value: 11 };
      const result = await coinOrderService.prepareCustomOrder(1, 100, activeTax, 1);

      expect(result.basePrice).toBe(100000);
      expect(result.taxAmount).toBe(11000);
      expect(result.gatewayFee).toBe(4000);
      expect(result.totalPrice).toBe(115000);
    });

    it('should throw INACTIVE_CURRENCY when there is no active currency', async () => {
      mockCurrencyRepo.findActive.mockResolvedValue(null);

      await expect(coinOrderService.prepareCustomOrder(1, 100, null, 1)).rejects.toMatchObject({
        statusCode: 404,
        code: 'INACTIVE_CURRENCY',
      });
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should throw ORDER_NOT_FOUND if order does not exist', async () => {
      mockCoinOrderRepo.findByPgOrderId.mockResolvedValue(null);

      await expect(coinOrderService.handlePaymentSuccess('invalid-id')).rejects.toThrow(AppError);
    });

    it('should skip crediting when the atomic PENDING->PAID flip matches no row', async () => {
      mockCoinOrderRepo.findByPgOrderId.mockResolvedValue({ id: 10, user_id: 1, status: 'PAID' });
      mockTx.coinOrder.updateMany.mockResolvedValue({ count: 0 });

      await coinOrderService.handlePaymentSuccess('already-paid-id');

      expect(mockTx.coinWallet.update).not.toHaveBeenCalled();
      expect(mockTx.coinTransaction.create).not.toHaveBeenCalled();
    });

    it('should credit the wallet and log a TOPUP transaction on success', async () => {
      const mockOrder = {
        id: 201,
        user_id: 1,
        currency_id: 1,
        coin_amount: 100,
        payment_method_id: 3,
        price_paid: '103900',
        status: 'PENDING',
      };
      mockCoinOrderRepo.findByPgOrderId.mockResolvedValue(mockOrder);
      mockTx.coinOrder.updateMany.mockResolvedValue({ count: 1 });
      mockTx.coinWallet.findUnique.mockResolvedValue({ id: 11, user_id: 1, balance: 50 });

      await coinOrderService.handlePaymentSuccess('valid-pg-order-id', 103900, 'bank_transfer');

      expect(mockTx.coinOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 201, status: 'PENDING' },
        data: { status: 'PAID' },
      });
      expect(mockTx.coinWallet.update).toHaveBeenCalledWith({
        where: { user_id: 1 },
        data: { balance: { increment: 100 }, last_updated: expect.any(Date) },
      });
      expect(mockTx.coinTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            wallet_id: 11,
            user_id: 1,
            type: 'TOPUP',
            amount: 100,
            payment_channel: 'bank_transfer',
          }),
        }),
      );
    });

    it('should throw AMOUNT_MISMATCH when the paid amount differs from the order total', async () => {
      mockCoinOrderRepo.findByPgOrderId.mockResolvedValue({
        id: 201,
        user_id: 1,
        price_paid: '103900',
        status: 'PENDING',
      });

      await expect(
        coinOrderService.handlePaymentSuccess('valid-pg-order-id', 50000),
      ).rejects.toMatchObject({ statusCode: 400, code: 'AMOUNT_MISMATCH' });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentFailure', () => {
    it('should atomically flip a PENDING order to FAILED', async () => {
      mockCoinOrderRepo.findByPgOrderId.mockResolvedValue({ id: 7, status: 'PENDING' });
      mockPrisma.coinOrder.updateMany.mockResolvedValue({ count: 1 });

      await coinOrderService.handlePaymentFailure('pg-7');

      expect(mockPrisma.coinOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 7, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
    });

    it('should do nothing when the order is not PENDING', async () => {
      mockCoinOrderRepo.findByPgOrderId.mockResolvedValue({ id: 7, status: 'PAID' });

      await coinOrderService.handlePaymentFailure('pg-7');

      expect(mockPrisma.coinOrder.updateMany).not.toHaveBeenCalled();
    });
  });
});
