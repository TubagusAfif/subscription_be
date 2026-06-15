import request from 'supertest';
import express from 'express';
import { createWebhookRouter } from '../../../megabank/routes/webhook.routes';
import { WebhookController } from '../../../megabank/controllers/webhook.controller';
import { CoinOrderService } from '../../../client/services/coin-order.service';
import { MegaBankPaymentService } from '../../../megabank/services/mega-bank-payment.service';

const mockCoinOrderService = {
  createOrder: jest.fn(),
  getUserOrders: jest.fn(),
  getOrderById: jest.fn(),
  handlePaymentSuccess: jest.fn(),
  handlePaymentFailure: jest.fn(),
} as unknown as jest.Mocked<CoinOrderService>;

const mockMegaBankPaymentService = {
  createInquiry: jest.fn(),
  getPaymentStatus: jest.fn(),
  verifyWebhookSignature: jest.fn(),
  generateValidateSignature: jest.fn(),
  isPaymentSuccess: jest.fn(),
  isPaymentFailure: jest.fn(),
  isInquiryPaid: jest.fn(),
} as unknown as jest.Mocked<MegaBankPaymentService>;

const mockWebhookProcessorService = {
  processWebhook: jest.fn(),
};

const app = express();

const webhookController = new WebhookController({
  megaBankPaymentService: mockMegaBankPaymentService,
  webhookProcessorService: mockWebhookProcessorService,
} as any);
const webhookRouter = createWebhookRouter(webhookController);

app.use('/api/v1/megabank/webhooks', webhookRouter);
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: { message: err.message, code: err.code } });
});

describe('MegaBank Webhook API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/megabank/webhooks/mpg', () => {
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

      mockMegaBankPaymentService.verifyWebhookSignature.mockReturnValue(true);
      mockMegaBankPaymentService.isPaymentSuccess.mockReturnValue(true);
      mockMegaBankPaymentService.isPaymentFailure.mockReturnValue(false);
      mockMegaBankPaymentService.generateValidateSignature.mockReturnValue('abc123');
      mockCoinOrderService.handlePaymentSuccess.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/megabank/webhooks/mpg')
        .set('Signature', 'sig123;1234567890')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.validateSignature).toBe('abc123');
      expect(mockWebhookProcessorService.processWebhook).toHaveBeenCalledWith(payload);
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

      mockMegaBankPaymentService.verifyWebhookSignature.mockReturnValue(true);
      mockMegaBankPaymentService.isPaymentSuccess.mockReturnValue(false);
      mockMegaBankPaymentService.isPaymentFailure.mockReturnValue(true);
      mockMegaBankPaymentService.generateValidateSignature.mockReturnValue('def456');
      mockWebhookProcessorService.processWebhook.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/megabank/webhooks/mpg')
        .set('Signature', 'sig123;1234567890')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(mockWebhookProcessorService.processWebhook).toHaveBeenCalledWith(payload);
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

      mockMegaBankPaymentService.verifyWebhookSignature.mockReturnValue(false);

      const response = await request(app)
        .post('/api/v1/megabank/webhooks/mpg')
        .set('Signature', 'invalid-sig;1234567890')
        .send(payload);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Invalid Bank Mega webhook signature.');
      expect(mockWebhookProcessorService.processWebhook).not.toHaveBeenCalled();
    });
  });
});
