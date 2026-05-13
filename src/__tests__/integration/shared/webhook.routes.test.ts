import request from 'supertest';
import express from 'express';
import { createWebhookRouter } from '../../../shared/routes/webhook.routes';
import { WebhookController } from '../../../shared/controllers/webhook.controller';
import { CoinOrderService } from '../../../client/services/coin-order.service';
import { MpgService } from '../../../shared/services/mpg.service';

const mockCoinOrderService = {
  createOrder: jest.fn(),
  getUserOrders: jest.fn(),
  getOrderById: jest.fn(),
  handlePaymentSuccess: jest.fn(),
  handlePaymentFailure: jest.fn(),
} as unknown as jest.Mocked<CoinOrderService>;

const mockMpgService = {
  createInquiry: jest.fn(),
  getPaymentStatus: jest.fn(),
  verifyWebhookSignature: jest.fn(),
  generateValidateSignature: jest.fn(),
  isPaymentSuccess: jest.fn(),
  isPaymentFailure: jest.fn(),
  isInquiryPaid: jest.fn(),
} as unknown as jest.Mocked<MpgService>;

const app = express();
app.use(express.json());

const webhookController = new WebhookController({
  mpgService: mockMpgService,
  coinOrderService: mockCoinOrderService,
} as any);
const webhookRouter = createWebhookRouter(webhookController);

app.use('/api/v1/shared/webhooks', webhookRouter);
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Webhook API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/shared/webhooks/mpg', () => {
    it('should process successful payment webhook', async () => {
      const payload = {
        type: 'payment.received',
        transaction: {
          id: 'txn-123',
          status: 'captured',
          statusCode: '00',
          inquiryId: 'inq-123',
        },
        inquiry: {
          id: 'inq-123',
          status: 'paid',
          order: { id: 'COIN-1-123' },
        },
      };

      mockMpgService.verifyWebhookSignature.mockReturnValue(true);
      mockMpgService.isPaymentSuccess.mockReturnValue(true);
      mockMpgService.isPaymentFailure.mockReturnValue(false);
      mockMpgService.generateValidateSignature.mockReturnValue('abc123');
      mockCoinOrderService.handlePaymentSuccess.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/shared/webhooks/mpg')
        .set('Signature', 'sig123;1234567890')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.validateSignature).toBe('abc123');
      expect(mockCoinOrderService.handlePaymentSuccess).toHaveBeenCalledWith('COIN-1-123');
    });

    it('should process failed payment webhook', async () => {
      const payload = {
        type: 'payment.received',
        transaction: {
          id: 'txn-123',
          status: 'declined',
          statusCode: 'AL01',
          inquiryId: 'inq-123',
        },
        inquiry: {
          id: 'inq-123',
          status: 'failed',
          order: { id: 'COIN-1-123' },
        },
      };

      mockMpgService.verifyWebhookSignature.mockReturnValue(true);
      mockMpgService.isPaymentSuccess.mockReturnValue(false);
      mockMpgService.isPaymentFailure.mockReturnValue(true);
      mockMpgService.generateValidateSignature.mockReturnValue('def456');
      mockCoinOrderService.handlePaymentFailure.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/shared/webhooks/mpg')
        .set('Signature', 'sig123;1234567890')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(mockCoinOrderService.handlePaymentFailure).toHaveBeenCalledWith('COIN-1-123');
    });

    it('should deny unauthorized webhook signatures', async () => {
      const payload = {
        type: 'payment.received',
        transaction: {
          id: 'txn-123',
          status: 'captured',
          statusCode: '00',
        },
        inquiry: {
          id: 'inq-123',
          order: { id: 'COIN-1-123' },
        },
      };

      mockMpgService.verifyWebhookSignature.mockReturnValue(false);

      const response = await request(app)
        .post('/api/v1/shared/webhooks/mpg')
        .set('Signature', 'invalid-sig;1234567890')
        .send(payload);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Invalid MPG webhook signature.');
      expect(mockCoinOrderService.handlePaymentSuccess).not.toHaveBeenCalled();
    });
  });
});
