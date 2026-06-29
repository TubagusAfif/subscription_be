import request from 'supertest';
import express from 'express';
import { createDashboardRouter } from '../../../subscription/routes/dashboard.routes';
import { AdminDashboardController } from '../../../subscription/controllers/dashboard.controller';

const mockDashboardService = { getDashboard: jest.fn() };

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new AdminDashboardController({ dashboardService: mockDashboardService as any });
app.use('/api/v1/subscription/dashboard', createDashboardRouter(controller, mockAuthenticate));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Subscription Dashboard API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'ADMIN' };
  });

  describe('GET /', () => {
    it('should return the dashboard for an ADMIN', async () => {
      mockDashboardService.getDashboard.mockResolvedValue({ users: { total: 5 } });

      const res = await request(app)
        .get('/api/v1/subscription/dashboard')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data.users.total).toBe(5);
    });

    it('should pass month/year/limit query params to the service', async () => {
      mockDashboardService.getDashboard.mockResolvedValue({});

      await request(app)
        .get('/api/v1/subscription/dashboard?month=3&year=2025&limit=20')
        .set('Authorization', 'Bearer t');

      expect(mockDashboardService.getDashboard).toHaveBeenCalledWith(3, 2025, 20);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/subscription/dashboard');
      expect(res.status).toBe(401);
    });

    it('should return 403 for an OWNER role', async () => {
      mockUser = { sub: 1, role: 'OWNER' };
      const res = await request(app)
        .get('/api/v1/subscription/dashboard')
        .set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });
  });
});
