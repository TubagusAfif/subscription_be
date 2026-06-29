import request from 'supertest';
import express from 'express';
import { createClientDashboardRouter } from '../../../client/routes/dashboard.routes';
import { ClientDashboardController } from '../../../client/controllers/dashboard.controller';

const mockDashboardService = { getDashboard: jest.fn() };

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new ClientDashboardController({ dashboardService: mockDashboardService as any });
app.use('/api/v1/client/dashboard', createClientDashboardRouter(controller, mockAuthenticate));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Client Dashboard API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 7, role: 'OWNER' };
  });

  describe('GET /', () => {
    it('should return the dashboard for the authenticated OWNER', async () => {
      mockDashboardService.getDashboard.mockResolvedValue({ totals: { coins: 100 } });

      const res = await request(app)
        .get('/api/v1/client/dashboard')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data.totals.coins).toBe(100);
      expect(mockDashboardService.getDashboard).toHaveBeenCalledWith(7);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/client/dashboard');
      expect(res.status).toBe(401);
    });

    it('should return 403 for a non-OWNER role', async () => {
      mockUser = { sub: 7, role: 'ADMIN' };
      const res = await request(app)
        .get('/api/v1/client/dashboard')
        .set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });
  });
});
