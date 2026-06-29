import { PlanService } from '../../../subscription/services/plan.service';
import { AppError } from '../../../shared/middlewares/error.middleware';

describe('PlanService', () => {
  let service: PlanService;

  const mockPlanRepo = {
    upsertPlan: jest.fn(),
    deactivate: jest.fn(),
  };

  const mockSharedPlanService = {
    getPlanById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlanService(mockPlanRepo as any, mockSharedPlanService as any);
  });

  describe('upsertPlanBase', () => {
    it('should create a new plan (no id) without an existence check', async () => {
      const created = { id: 1, sku_code: 'BASIC_M' };
      mockPlanRepo.upsertPlan.mockResolvedValue(created);

      const data = { sku_name: 'Basic', sku_code: 'BASIC_M', sku_type: 'PACKAGE' } as any;
      const result = await service.upsertPlanBase(data, 5);

      expect(mockSharedPlanService.getPlanById).not.toHaveBeenCalled();
      expect(mockPlanRepo.upsertPlan).toHaveBeenCalledWith(data, 5, undefined);
      expect(result).toEqual(created);
    });

    it('should verify existence first when an id is provided (update path)', async () => {
      mockSharedPlanService.getPlanById.mockResolvedValue({ id: 2 });
      mockPlanRepo.upsertPlan.mockResolvedValue({ id: 2 });

      await service.upsertPlanBase({ id: 2, sku_code: 'X' } as any, 5);

      expect(mockSharedPlanService.getPlanById).toHaveBeenCalledWith(2);
      expect(mockPlanRepo.upsertPlan).toHaveBeenCalled();
    });

    it('should propagate 404 when updating a non-existent plan', async () => {
      mockSharedPlanService.getPlanById.mockRejectedValue(
        new AppError('PLAN_NOT_FOUND', 'Plan with ID 2 not found.', 404),
      );

      await expect(service.upsertPlanBase({ id: 2 } as any, 5)).rejects.toMatchObject({
        statusCode: 404,
        code: 'PLAN_NOT_FOUND',
      });
      expect(mockPlanRepo.upsertPlan).not.toHaveBeenCalled();
    });

    it('should translate P2002 into 409 DUPLICATE_SKU', async () => {
      mockPlanRepo.upsertPlan.mockRejectedValue({ code: 'P2002' });

      await expect(service.upsertPlanBase({ sku_code: 'DUP' } as any, 5)).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_SKU',
      });
    });

    it('should forward the transaction client when provided', async () => {
      const tx = {} as any;
      mockPlanRepo.upsertPlan.mockResolvedValue({ id: 1 });

      await service.upsertPlanBase({ sku_code: 'X' } as any, 5, tx);

      expect(mockPlanRepo.upsertPlan).toHaveBeenCalledWith({ sku_code: 'X' }, 5, tx);
    });
  });

  describe('deactivatePlan', () => {
    it('should verify existence then deactivate', async () => {
      mockSharedPlanService.getPlanById.mockResolvedValue({ id: 1 });
      mockPlanRepo.deactivate.mockResolvedValue(undefined);

      await service.deactivatePlan(1, 8);

      expect(mockSharedPlanService.getPlanById).toHaveBeenCalledWith(1);
      expect(mockPlanRepo.deactivate).toHaveBeenCalledWith(1, 8);
    });

    it('should propagate 404 when deactivating a missing plan', async () => {
      mockSharedPlanService.getPlanById.mockRejectedValue(
        new AppError('PLAN_NOT_FOUND', 'Plan with ID 1 not found.', 404),
      );

      await expect(service.deactivatePlan(1, 8)).rejects.toMatchObject({ statusCode: 404 });
      expect(mockPlanRepo.deactivate).not.toHaveBeenCalled();
    });
  });
});
