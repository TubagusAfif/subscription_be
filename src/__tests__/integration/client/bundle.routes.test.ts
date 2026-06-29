import request from 'supertest';
import express from 'express';
import { createClientBundleRouter } from '../../../client/routes/bundle.routes';
import { SharedBundleController } from '../../../shared/controllers/bundle.controller';

const mockBundleService = { getAllBundles: jest.fn() };

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) return next({ statusCode: 401, message: 'Missing token' });
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());
const controller = new SharedBundleController(mockBundleService as any);
app.use('/api/v1/client/bundles', createClientBundleRouter(controller, mockAuthenticate));
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

describe('Client Bundle API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'OWNER' };
  });

  describe('GET /', () => {
    it('should return only active bundles for an OWNER', async () => {
      mockBundleService.getAllBundles.mockResolvedValue({
        data: [
          { id: 1, bundle_name: 'A', is_active: true },
          { id: 2, bundle_name: 'B', is_active: false },
        ],
      });

      const res = await request(app)
        .get('/api/v1/client/bundles')
        .set('Authorization', 'Bearer t');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/client/bundles');
      expect(res.status).toBe(401);
      expect(mockBundleService.getAllBundles).not.toHaveBeenCalled();
    });

    it('should return 403 for a non-OWNER role', async () => {
      mockUser = { sub: 1, role: 'ADMIN' };
      const res = await request(app)
        .get('/api/v1/client/bundles')
        .set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
      expect(mockBundleService.getAllBundles).not.toHaveBeenCalled();
    });
  });
});
