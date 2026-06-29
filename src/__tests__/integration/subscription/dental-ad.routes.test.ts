import request from 'supertest';
import express from 'express';
import { createDentalAdRouter } from '../../../subscription/routes/dental-ad.routes';
import { DentalAdController } from '../../../subscription/controllers/dental-ad.controller';

const mockDentalAdService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new DentalAdController(mockDentalAdService as any);
app.use('/api/v1/subscription/dental-ads', createDentalAdRouter(controller, mockAuthenticate));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Subscription Dental Ad API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'ADMIN' };
  });

  describe('GET /', () => {
    it('should list dental ads', async () => {
      mockDentalAdService.findAll.mockResolvedValue({
        data: [{ id: 1, name: 'Promo' }],
        meta: { total: 1, page: 1, limit: 10 },
      });

      const res = await request(app)
        .get('/api/v1/subscription/dental-ads')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/subscription/dental-ads');
      expect(res.status).toBe(401);
    });

    it('should return 403 for a role outside the allowlist', async () => {
      mockUser = { sub: 1, role: 'STAFF' };
      const res = await request(app)
        .get('/api/v1/subscription/dental-ads')
        .set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /', () => {
    it('should create a dental ad and return 201', async () => {
      mockDentalAdService.create.mockResolvedValue({ id: 2, name: 'Promo' });

      const res = await request(app)
        .post('/api/v1/subscription/dental-ads')
        .set('Authorization', 'Bearer t')
        .send({ name: 'Promo', category: 'GENERAL', image_path: '/img/a.png' });

      expect(res.status).toBe(201);
      expect(mockDentalAdService.create).toHaveBeenCalledWith(
        { name: 'Promo', category: 'GENERAL', image_path: '/img/a.png' },
        1,
      );
    });
  });

  describe('GET /:id', () => {
    it('should return a dental ad by id', async () => {
      mockDentalAdService.findById.mockResolvedValue({ id: 4, name: 'X' });

      const res = await request(app)
        .get('/api/v1/subscription/dental-ads/4')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(mockDentalAdService.findById).toHaveBeenCalledWith(4);
    });

    it('should propagate a 404 from the service', async () => {
      mockDentalAdService.findById.mockRejectedValue({ statusCode: 404, message: 'Dental ad not found' });

      const res = await request(app)
        .get('/api/v1/subscription/dental-ads/99')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('should remove a dental ad and return 200 with null data', async () => {
      mockDentalAdService.remove.mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/v1/subscription/dental-ads/4')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
      expect(mockDentalAdService.remove).toHaveBeenCalledWith(4, 1);
    });
  });
});
