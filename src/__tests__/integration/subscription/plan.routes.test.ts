import request from 'supertest';
import express, { Express } from 'express';
import { createPlanRouter } from '../../../subscription/routes/plan.routes';
import { PlanController } from '../../../subscription/controllers/plan.controller';
import { PlanService } from '../../../subscription/services/plan.service';
import { BenefitService } from '../../../subscription/services/benefit.service';
import { FeatureService } from '../../../subscription/services/feature.service';
import { AddonService } from '../../../subscription/services/addon.service';
import { PrismaClient } from '@prisma/client';

import { SharedPlanService } from '../../../shared/services/plan.service';
import { SharedPlanController } from '../../../shared/controllers/plan.controller';

// Mock Services
jest.mock('../../../subscription/services/plan.service');
jest.mock('../../../subscription/services/benefit.service');
jest.mock('../../../subscription/services/feature.service');
jest.mock('../../../subscription/services/addon.service');
jest.mock('../../../shared/services/plan.service');

const mockSharedPlanService = new SharedPlanService({} as any) as jest.Mocked<SharedPlanService>;
const mockPlanService = new PlanService(
  {} as any,
  mockSharedPlanService as any,
) as jest.Mocked<PlanService>;
const mockBenefitService = new BenefitService({} as any) as jest.Mocked<BenefitService>;
const mockFeatureService = new FeatureService({} as any) as jest.Mocked<FeatureService>;
const mockAddonService = new AddonService({} as any) as jest.Mocked<AddonService>;

// Mock Prisma
const mockPrisma = {
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
} as unknown as PrismaClient;

let mockUser: { sub: number; role: string };
const mockAuthenticate: express.RequestHandler = (req: any, _res, next) => {
  if (!req.headers.authorization) {
    return next({ statusCode: 401, message: 'Missing token' });
  }
  req.user = mockUser;
  next();
};

const app = express();
app.use(express.json());

const planController = new PlanController(
  mockPrisma,
  mockPlanService,
  mockBenefitService,
  mockFeatureService,
  mockAddonService,
);

const sharedPlanController = new SharedPlanController(mockSharedPlanService);

const planRouter = createPlanRouter(planController, sharedPlanController, mockAuthenticate);

app.use('/api/v1/subscription/plans', planRouter);
// Basic error handler to catch next(error)
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err });
});

/** 
---------------------------------------------------------------
  Integration tests for Plan (SKU) API Endpoints
---------------------------------------------------------------
**/
describe('Plan API Routes', () => {
  const validToken = 'valid-token';
  const ownerToken = 'owner-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { sub: 1, role: 'ADMIN' };
  });

  describe('POST /api/v1/subscription/plans (UPSERT)', () => {
    const validPayload = {
      sku_name: 'Basic Plan',
      sku_code: 'BASIC_M',
      sku_type: 'PACKAGE',
      coin_cost: 0,
      benefits: [],
      features: [],
      addons: [],
    };

    it('should upsert a plan successfully when authenticated as ADMIN', async () => {
      const createdPlan = { id: 1, ...validPayload };
      mockPlanService.upsertPlanBase.mockResolvedValue(createdPlan as any);
      mockBenefitService.upsertBenefits.mockResolvedValue([]);
      mockFeatureService.upsertFeatures.mockResolvedValue([]);
      mockAddonService.upsertAddons.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/v1/subscription/plans')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ ...createdPlan });
      expect(mockPlanService.upsertPlanBase).toHaveBeenCalled();
    });

    it('should return 401 if missing auth token', async () => {
      const response = await request(app).post('/api/v1/subscription/plans').send(validPayload);

      expect(response.status).toBe(401);
      expect(mockPlanService.upsertPlanBase).not.toHaveBeenCalled();
    });

    it('should return 400 if validation fails', async () => {
      const response = await request(app)
        .post('/api/v1/subscription/plans')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ sku_name: 'no type or code' });

      expect(response.status).toBe(400);
      expect(mockPlanService.upsertPlanBase).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/subscription/plans', () => {
    it('should return list of plans', async () => {
      mockSharedPlanService.getAllPlans.mockResolvedValue({
        data: [{ id: 1, sku_name: 'Plan 1' } as any],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      } as any);

      const response = await request(app)
        .get('/api/v1/subscription/plans')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBe(1);
      expect(mockSharedPlanService.getAllPlans).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/subscription/plans/:id', () => {
    it('should return a plan by ID', async () => {
      mockSharedPlanService.getPlanById.mockResolvedValue({ id: 1, sku_name: 'Plan 1' } as any);

      const response = await request(app)
        .get('/api/v1/subscription/plans/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(1);
    });
  });

  describe('DELETE /api/v1/subscription/plans/:id', () => {
    it('should return 204 when deleted by ADMIN', async () => {
      mockPlanService.deactivatePlan.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/v1/subscription/plans/1')
        .set('Authorization', `Bearer ${validToken}`); // validToken is ADMIN

      expect(response.status).toBe(204);
      expect(mockPlanService.deactivatePlan).toHaveBeenCalledWith(1, 1);
    });

    it('should return 403 when deleted by OWNER (insufficient permissions)', async () => {
      mockUser = { sub: 1, role: 'OWNER' };
      const response = await request(app)
        .delete('/api/v1/subscription/plans/1')
        .set('Authorization', `Bearer ${ownerToken}`); // ownerToken is OWNER

      expect(response.status).toBe(403);
      expect(mockPlanService.deactivatePlan).not.toHaveBeenCalled();
    });
  });
});
