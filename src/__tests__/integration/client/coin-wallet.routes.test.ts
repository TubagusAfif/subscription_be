import request from 'supertest';
import express from 'express';
import { createCoinWalletRouter } from '../../../client/routes/coin-wallet.routes';
import { CoinWalletController } from '../../../client/controllers/coin-wallet.controller';
import { CoinWalletService } from '../../../client/services/coin-wallet.service';

const mockCoinWalletService = {
  getWallet: jest.fn(),
  getTransactions: jest.fn(),
  spend: jest.fn(),
} as unknown as jest.Mocked<CoinWalletService>;

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());

const coinWalletController = new CoinWalletController({
  coinWalletService: mockCoinWalletService,
} as any);
const coinWalletRouter = createCoinWalletRouter(coinWalletController, mockAuthenticate);

app.use('/api/v1/client/coin-wallets', coinWalletRouter);
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Coin Wallet API Routes', () => {
  const ownerToken = 'owner-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'OWNER' };
  });

  describe('GET /api/v1/client/coin-wallets', () => {
    it('should return wallet balance for authenticated user', async () => {
      mockCoinWalletService.getWallet.mockResolvedValue({ balance: 500 } as any);

      const response = await request(app)
        .get('/api/v1/client/coin-wallets')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBe(500);
      expect(mockCoinWalletService.getWallet).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /api/v1/client/coin-wallets/transactions', () => {
    it('should return transaction history', async () => {
      mockCoinWalletService.getTransactions.mockResolvedValue([{ id: 1, amount: 100 }] as any[]);

      const response = await request(app)
        .get('/api/v1/client/coin-wallets/transactions')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockCoinWalletService.getTransactions).toHaveBeenCalledWith(1);
    });
  });
});
