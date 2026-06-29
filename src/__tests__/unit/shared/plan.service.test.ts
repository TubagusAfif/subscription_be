import { SharedPlanService } from '../../../shared/services/plan.service';
import { SharedPlanRepository } from '../../../shared/repositories/plan.repository';
import { AppError } from '../../../shared/middlewares/error.middleware';

describe('SharedPlanService', () => {
  let service: SharedPlanService;
  let mockRepo: jest.Mocked<SharedPlanRepository>;

  const mockPlan = {
    id: 1,
    sku_name: 'Basic Plan',
    sku_code: 'BASIC_M',
    sku_type: 'PACKAGE',
  };

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<SharedPlanRepository>;

    service = new SharedPlanService(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPlans', () => {
    it('should return a paginated result with meta', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [mockPlan], total: 1 } as any);

      const result = await service.getAllPlans('basic', 1, 10);

      expect(mockRepo.findAll).toHaveBeenCalledWith('basic', 1, 10);
      expect(result.data).toEqual([mockPlan]);
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10, total_pages: 1 });
    });

    it('should default page and limit when not provided', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0 } as any);

      await service.getAllPlans();

      expect(mockRepo.findAll).toHaveBeenCalledWith(undefined, 1, 10);
    });
  });

  describe('getPlanById', () => {
    it('should return the plan when found', async () => {
      mockRepo.findById.mockResolvedValue(mockPlan as any);

      expect(await service.getPlanById(1)).toEqual(mockPlan);
      expect(mockRepo.findById).toHaveBeenCalledWith(1);
    });

    it('should throw 404 PLAN_NOT_FOUND when missing', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getPlanById(42)).rejects.toThrow(AppError);
      await expect(service.getPlanById(42)).rejects.toMatchObject({
        statusCode: 404,
        code: 'PLAN_NOT_FOUND',
        message: 'Plan with ID 42 not found.',
      });
    });
  });
});
