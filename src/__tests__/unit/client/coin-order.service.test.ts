import { CoinOrderService } from '../../../client/services/coin-order.service';
import { AppError } from '../../../shared/middlewares/error.middleware';

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
    updatePaymentInfo: jest.fn(),
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
      currencyRepository: mockCurrencyRepo as any,
      paymentMethodRepository: mockPaymentMethodRepo as any,
      prisma: mockPrisma as any,
    });
  });

  describe('prepareBundleOrder', () => {
    it('should throw BUNDLE_NOT_FOUND if bundle does not exist', async () => {
      mockBundleRepo.findById.mockResolvedValue(null);

      await expect(
        coinOrderService.prepareBundleOrder(1, 999, 'va'),
      ).rejects.toThrow(AppError);

      await expect(
        coinOrderService.prepareBundleOrder(1, 999, 'va'),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Coin bundle with ID 999 not found.' });
    });

    it('should throw INVALID_PAYMENT_METHOD if payment method does not exist or is inactive', async () => {
      const mockBundle = { id: 1, price: '100000', tax_rate: '11' };
      mockBundleRepo.findById.mockResolvedValue(mockBundle);
      mockPaymentMethodRepo.findByCode.mockResolvedValue(null);

      await expect(
        coinOrderService.prepareBundleOrder(1, 1, 'invalid_pm'),
      ).rejects.toThrow(AppError);
    });

    it('should prepare an order and calculate price, tax, and fixed gateway fee correctly', async () => {
      const mockBundle = {
        id: 1,
        bundle_name: '100 Coins',
        coin_amount: 100,
        currency_id: 1,
        price: '100000',
        discounted_price: '90000',
        tax_rate: '11',
      };
      const mockPaymentMethod = {
        id: 1,
        name: 'Virtual Account',
        code: 'va',
        fee_type: 'FIXED',
        fee_value: 4000.00,
        is_active: true,
      };

      const expectedBasePrice = 90000;
      const expectedTaxAmount = 90000 * 0.11; // 9900
      const expectedGatewayFee = 4000;
      const expectedTotalPrice = expectedBasePrice + expectedTaxAmount + expectedGatewayFee; // 103900

      mockBundleRepo.findById.mockResolvedValue(mockBundle);
      mockPaymentMethodRepo.findByCode.mockResolvedValue(mockPaymentMethod);

      const result = await coinOrderService.prepareBundleOrder(1, 1, 'va');

      expect(mockBundleRepo.findById).toHaveBeenCalledWith(1);
      expect(mockPaymentMethodRepo.findByCode).toHaveBeenCalledWith('va');
      expect(result.bundle).toEqual(mockBundle);
      expect(result.basePrice).toBe(expectedBasePrice);
      expect(result.taxAmount).toBe(expectedTaxAmount);
      expect(result.gatewayFee).toBe(expectedGatewayFee);
      expect(result.totalPrice).toBe(expectedTotalPrice);
      expect(result.pgOrderId).toContain('COIN-1-');
    });

    it('should prepare an order and calculate price, tax, and percentage gateway fee correctly', async () => {
      const mockBundle = {
        id: 1,
        bundle_name: '100 Coins',
        coin_amount: 100,
        currency_id: 1,
        price: '100000',
        discounted_price: '90000',
        tax_rate: '11',
      };
      const mockPaymentMethod = {
        id: 2,
        name: 'Credit Card',
        code: 'credit_card',
        fee_type: 'PERCENTAGE',
        fee_value: 2.9,
        is_active: true,
      };

      const expectedBasePrice = 90000;
      const expectedTaxAmount = 90000 * 0.11; // 9900
      const expectedGatewayFee = Math.round((expectedBasePrice + expectedTaxAmount) * 0.029); // Math.round(99900 * 0.029) = 2897
      const expectedTotalPrice = expectedBasePrice + expectedTaxAmount + expectedGatewayFee;

      mockBundleRepo.findById.mockResolvedValue(mockBundle);
      mockPaymentMethodRepo.findByCode.mockResolvedValue(mockPaymentMethod);

      const result = await coinOrderService.prepareBundleOrder(1, 1, 'credit_card');

      expect(result.gatewayFee).toBe(expectedGatewayFee);
      expect(result.totalPrice).toBe(expectedTotalPrice);
    });
  });

  describe('prepareCustomOrder', () => {
    it('should prepare a custom order and calculate price, tax, and gateway fee correctly', async () => {
      const mockCurrency = {
        id: 1,
        conversion_rate: 1000,
      };
      const mockPaymentMethod = {
        id: 1,
        name: 'Virtual Account',
        code: 'va',
        fee_type: 'FIXED',
        fee_value: 4000.00,
        is_active: true,
      };

      mockCurrencyRepo.findActive.mockResolvedValue(mockCurrency);
      mockPaymentMethodRepo.findByCode.mockResolvedValue(mockPaymentMethod);

      const result = await coinOrderService.prepareCustomOrder(1, 100, 11, 'va');

      expect(result.basePrice).toBe(100000);
      expect(result.taxAmount).toBe(11000);
      expect(result.gatewayFee).toBe(4000);
      expect(result.totalPrice).toBe(115000);
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
