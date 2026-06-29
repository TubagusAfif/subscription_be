import request from 'supertest';
import express from 'express';
import { createClientPlanRouter } from '../../../client/routes/plan.routes';
import { SharedPlanController } from '../../../shared/controllers/plan.controller';

const mockPlanService = { getAllPlans: jest.fn(), getPlanById: jest.fn() };

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new SharedPlanController(mockPlanService as any);
app.use('/api/v1/client/plans', createClientPlanRouter(controller, mockAuthenticate));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Client Plan API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'OWNER' };
  });

  describe('GET /', () => {
    it('should return a paginated list of plans', async () => {
      mockPlanService.getAllPlans.mockResolvedValue({
        data: [{ id: 1, sku_name: 'Basic' }],
        meta: { total: 1, page: 1, limit: 10, total_pages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/client/plans')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/client/plans');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /:id', () => {
    it('should return a plan by id', async () => {
      mockPlanService.getPlanById.mockResolvedValue({ id: 3, sku_name: 'Gold' });

      const res = await request(app)
        .get('/api/v1/client/plans/3')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(3);
      expect(mockPlanService.getPlanById).toHaveBeenCalledWith(3);
    });

    it('should propagate a 404 from the service', async () => {
      mockPlanService.getPlanById.mockRejectedValue({
        statusCode: 404,
        code: 'PLAN_NOT_FOUND',
        message: 'Plan with ID 99 not found.',
      });

      const res = await request(app)
        .get('/api/v1/client/plans/99')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(404);
    });
  });
});
