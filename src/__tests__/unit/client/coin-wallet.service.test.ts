import { CoinWalletService } from '../../../client/services/coin-wallet.service';
import { AppError } from '../../../shared/middlewares/error.middleware';

describe('CoinWalletService', () => {
  let service: CoinWalletService;

  const mockWalletRepo = {
    findByUserId: jest.fn(),
    deductBalanceIfSufficient: jest.fn(),
  };
  const mockTransactionRepo = {
    findByUserId: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CoinWalletService({
      coinWalletRepository: mockWalletRepo as any,
      coinTransactionRepository: mockTransactionRepo as any,
    });
  });

  describe('getWallet', () => {
    it('should return the wallet from the repository', async () => {
      const wallet = { id: 1, user_id: 1, balance: 100 };
      mockWalletRepo.findByUserId.mockResolvedValue(wallet);

      expect(await service.getWallet(1)).toEqual(wallet);
      expect(mockWalletRepo.findByUserId).toHaveBeenCalledWith(1);
    });

    it('should return null when no wallet exists', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(null);
      expect(await service.getWallet(1)).toBeNull();
    });
  });

  describe('getTransactions', () => {
    it('should return transactions for the user', async () => {
      const txs = [{ id: 1 }, { id: 2 }];
      mockTransactionRepo.findByUserId.mockResolvedValue(txs);

      expect(await service.getTransactions(1)).toEqual(txs);
      expect(mockTransactionRepo.findByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe('spend', () => {
    it('should throw 404 WALLET_NOT_FOUND when the user has no wallet', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(null);

      await expect(service.spend(1, 10, 'desc', 5, 1)).rejects.toMatchObject({
        statusCode: 404,
        code: 'WALLET_NOT_FOUND',
      });
      expect(mockWalletRepo.deductBalanceIfSufficient).not.toHaveBeenCalled();
    });

    it('should throw 400 INSUFFICIENT_BALANCE when the atomic deduction fails', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue({ id: 9, balance: 5 });
      mockWalletRepo.deductBalanceIfSufficient.mockResolvedValue(false);

      await expect(service.spend(1, 10, 'desc', 5, 1)).rejects.toThrow(AppError);
      await expect(service.spend(1, 10, 'desc', 5, 1)).rejects.toMatchObject({
        statusCode: 400,
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient coin balance. Required: 10, Available: 5',
      });
      expect(mockTransactionRepo.create).not.toHaveBeenCalled();
    });

    it('should deduct and record a SPEND transaction on success', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue({ id: 9, balance: 100 });
      mockWalletRepo.deductBalanceIfSufficient.mockResolvedValue(true);
      const created = { id: 50, type: 'SPEND' };
      mockTransactionRepo.create.mockResolvedValue(created);

      const result = await service.spend(1, 30, 'Buy plan', 7, 2);

      expect(mockWalletRepo.deductBalanceIfSufficient).toHaveBeenCalledWith(1, 30);
      expect(mockTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          wallet_id: 9,
          user_id: 1,
          type: 'SPEND',
          amount: 30,
          currency_id: 2,
          ref_id: 7,
          description: 'Buy plan',
        }),
      );
      expect(result).toEqual(created);
    });
  });
});
