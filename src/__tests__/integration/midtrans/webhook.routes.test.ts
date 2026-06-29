import request from 'supertest';
import express from 'express';
import { createMidtransWebhookRouter } from '../../../midtrans/routes/webhook.routes';
import { MidtransWebhookController } from '../../../midtrans/controllers/midtrans-webhook.controller';

const mockProcessor = { processWebhook: jest.fn() };
const mockMidtransPaymentService = { verifyWebhookSignature: jest.fn() };

const app = express();
const controller = new MidtransWebhookController({
  midtransWebhookProcessorService: mockProcessor as any,
  midtransPaymentService: mockMidtransPaymentService as any,
});
app.use('/api/v1/midtrans/webhook', createMidtransWebhookRouter(controller));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

const validNotification = {
  order_id: 'COIN-1',
  signature_key: 'sig-abc',
  transaction_status: 'settlement',
  gross_amount: '100000.00',
  payment_type: 'bank_transfer',
  status_code: '200',
};

describe('Midtrans Webhook API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /notification', () => {
    it('should process a valid, correctly-signed notification', async () => {
      mockMidtransPaymentService.verifyWebhookSignature.mockReturnValue(true);
      mockProcessor.processWebhook.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/v1/midtrans/webhook/notification')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(validNotification));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(mockProcessor.processWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ order_id: 'COIN-1' }),
      );
    });

    it('should return 400 for a malformed notification (missing order_id/signature)', async () => {
      const res = await request(app)
        .post('/api/v1/midtrans/webhook/notification')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ transaction_status: 'settlement' }));

      expect(res.status).toBe(400);
      expect(mockProcessor.processWebhook).not.toHaveBeenCalled();
    });

    it('should return 403 when the signature is invalid', async () => {
      mockMidtransPaymentService.verifyWebhookSignature.mockReturnValue(false);

      const res = await request(app)
        .post('/api/v1/midtrans/webhook/notification')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(validNotification));

      expect(res.status).toBe(403);
      expect(mockProcessor.processWebhook).not.toHaveBeenCalled();
    });
  });
});
