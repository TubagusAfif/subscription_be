import request from 'supertest';
import express from 'express';
import { createPaymentGatewayRouter } from '../../../subscription/routes/payment-gateway.routes';
import { PaymentGatewayController } from '../../../subscription/controllers/payment-gateway.controller';
import { PaymentGatewayService } from '../../../subscription/services/payment-gateway.service';

jest.mock('../../../subscription/services/payment-gateway.service');
const mockGatewayService = new PaymentGatewayService(
  {} as any,
) as jest.Mocked<PaymentGatewayService>;

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());

const gatewayController = new PaymentGatewayController({ gatewayService: mockGatewayService });
const gatewayRouter = createPaymentGatewayRouter(gatewayController, mockAuthenticate);

app.use('/api/v1/subscription/payment-gateways', gatewayRouter);
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('PaymentGateway API Routes', () => {
  const validToken = 'valid-token';
  const ownerToken = 'owner-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'ADMIN' };
  });

  describe('POST /api/v1/subscription/payment-gateways', () => {
    const validPayload = {
      gateway_name: 'Stripe',
      provider: 'stripe',
      api_key_ref: 'STRIPE_API',
    };

    it('should create a gateway successfully', async () => {
      mockGatewayService.createGateway.mockResolvedValue({
        id: 1,
        ...validPayload,
        is_active: true,
      } as any);

      const response = await request(app)
        .post('/api/v1/subscription/payment-gateways')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload);

      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/v1/subscription/payment-gateways', () => {
    it('should return list of gateways', async () => {
      mockGatewayService.getAllGateways.mockResolvedValue([
        { id: 1, gateway_name: 'Stripe' },
      ] as any);

      const response = await request(app)
        .get('/api/v1/subscription/payment-gateways')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.gateways).toHaveLength(1);
    });
  });

  describe('GET /api/v1/subscription/payment-gateways/:id', () => {
    it('should return a gateway by ID', async () => {
      mockGatewayService.getGatewayById.mockResolvedValue({ id: 1, gateway_name: 'Stripe' } as any);

      const response = await request(app)
        .get('/api/v1/subscription/payment-gateways/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/v1/subscription/payment-gateways/:id', () => {
    it('should update a gateway', async () => {
      mockGatewayService.updateGateway.mockResolvedValue({
        id: 1,
        gateway_name: 'Updated Stripe',
      } as any);

      const response = await request(app)
        .put('/api/v1/subscription/payment-gateways/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ gateway_name: 'Updated Stripe' });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/subscription/payment-gateways/:id', () => {
    it('should return 204 when deleted by OWNER', async () => {
      mockGatewayService.removeGateway.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/v1/subscription/payment-gateways/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(204);
    });
  });
});
