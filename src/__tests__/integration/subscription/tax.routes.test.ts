import request from 'supertest';
import express from 'express';
import { createTaxRouter } from '../../../subscription/routes/tax.routes';
import { TaxController } from '../../../subscription/controllers/tax.controller';
import { TaxService } from '../../../subscription/services/tax.service';

// Mock the Service
jest.mock('../../../subscription/services/tax.service');
const mockTaxService = new TaxService({} as any) as jest.Mocked<TaxService>;

// Mock user payload — will be set per-test in beforeEach
let mockUser: { sub: number; role: string };

// Mock authenticate middleware — injects req.user and calls next()
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());

const taxController = new TaxController({ taxService: mockTaxService });
const taxRouter = createTaxRouter(taxController, mockAuthenticate);

app.use('/api/v1/subscription/taxes', taxRouter);
// Basic error handler
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Tax API Routes', () => {
  const validToken = 'valid-token';
  const ownerToken = 'owner-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'ADMIN' };
  });

  describe('POST /api/v1/subscription/taxes', () => {
    const validPayload = {
      tax_name: 'VAT 10%',
      rate_percent: 10,
      region: 'UK',
    };

    it('should create a tax successfully when ADMIN', async () => {
      mockTaxService.createTax.mockResolvedValue({
        id: 1,
        ...validPayload,
        is_active: true,
      } as any);

      const response = await request(app)
        .post('/api/v1/subscription/taxes')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(mockTaxService.createTax).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/subscription/taxes', () => {
    it('should return list of taxes', async () => {
      mockTaxService.getAllTaxes.mockResolvedValue({
        data: [{ id: 1, tax_name: 'VAT' }],
        meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 }
      } as any);

      const response = await request(app)
        .get('/api/v1/subscription/taxes')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/subscription/taxes/:id', () => {
    it('should return a tax by ID', async () => {
      mockTaxService.getTaxById.mockResolvedValue({ id: 1, tax_name: 'VAT' } as any);

      const response = await request(app)
        .get('/api/v1/subscription/taxes/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(1);
    });
  });

  describe('PUT /api/v1/subscription/taxes/:id', () => {
    it('should update a tax', async () => {
      mockTaxService.updateTax.mockResolvedValue({ id: 1, tax_name: 'VAT 20%' } as any);

      const response = await request(app)
        .put('/api/v1/subscription/taxes/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ tax_name: 'VAT 20%' });

      expect(response.status).toBe(200);
      expect(response.body.data.tax_name).toBe('VAT 20%');
    });
  });

  describe('DELETE /api/v1/subscription/taxes/:id', () => {
    it('should return 204 when deleted by OWNER', async () => {
      mockUser = { sub: 1, role: 'OWNER' };
      mockTaxService.removeTax.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/v1/subscription/taxes/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(204);
    });

    it('should return 403 when deleted by ADMIN', async () => {
      mockUser = { sub: 1, role: 'ADMIN' };
      const response = await request(app)
        .delete('/api/v1/subscription/taxes/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/subscription/taxes/active', () => {
    it('should return the active tax', async () => {
      mockTaxService.getActiveTax.mockResolvedValue({
        id: 1,
        tax_name: 'PPN',
        rate_percent: 11,
        region: 'ID',
        is_active: true,
      } as any);

      const response = await request(app)
        .get('/api/v1/subscription/taxes/active')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.tax.id).toBe(1);
      expect(response.body.data.tax.is_active).toBe(true);
    });

    it('should return null when no active tax exists', async () => {
      mockTaxService.getActiveTax.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/subscription/taxes/active')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.tax).toBeNull();
    });
  });

  describe('PATCH /api/v1/subscription/taxes/:id/activate', () => {
    it('should activate a tax and return it', async () => {
      mockTaxService.activateTax.mockResolvedValue({
        id: 2,
        tax_name: 'GST',
        rate_percent: 5,
        region: 'SG',
        is_active: true,
      } as any);

      const response = await request(app)
        .patch('/api/v1/subscription/taxes/2/activate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(2);
      expect(response.body.data.is_active).toBe(true);
      expect(mockTaxService.activateTax).toHaveBeenCalledWith(2, 1);
    });

    it('should return 404 when tax does not exist', async () => {
      const { AppError } = require('../../../shared/middlewares/error.middleware');
      mockTaxService.activateTax.mockRejectedValue(
        new AppError('TAX_NOT_FOUND', 'Tax configuration with ID 999 not found.', 404),
      );

      const response = await request(app)
        .patch('/api/v1/subscription/taxes/999/activate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject non-integer ID', async () => {
      const response = await request(app)
        .patch('/api/v1/subscription/taxes/abc/activate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
    });
  });
});

