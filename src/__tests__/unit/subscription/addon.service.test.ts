import { AddonService } from '../../../subscription/services/addon.service';
import { AddonRepository } from '../../../subscription/repositories/addon.repository';
import { AppError } from '../../../shared/middlewares/error.middleware';

describe('AddonService', () => {
  let service: AddonService;
  let mockRepo: jest.Mocked<AddonRepository>;

  beforeEach(() => {
    mockRepo = {
      upsertAddons: jest.fn(),
      removeAddons: jest.fn(),
    } as unknown as jest.Mocked<AddonRepository>;

    service = new AddonService(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertAddons', () => {
    it('should upsert valid addons (CLINIC_ADDON / USER_ADDON)', async () => {
      const addons = [
        { resource_type: 'CLINIC_ADDON', quantity: 1 },
        { resource_type: 'USER_ADDON', quantity: 5 },
      ];
      mockRepo.upsertAddons.mockResolvedValue(addons as any);

      const result = await service.upsertAddons(1, addons, 3);

      expect(mockRepo.upsertAddons).toHaveBeenCalledWith(1, addons, 3, undefined);
      expect(result).toEqual(addons);
    });

    it('should throw 400 INVALID_ADDON for an unsupported resource_type', async () => {
      const addons = [{ resource_type: 'UNKNOWN' }];

      await expect(service.upsertAddons(1, addons, 3)).rejects.toThrow(AppError);
      await expect(service.upsertAddons(1, addons, 3)).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_ADDON',
        message: 'Addon resource_type UNKNOWN is not supported.',
      });
      expect(mockRepo.upsertAddons).not.toHaveBeenCalled();
    });

    it('should pass the transaction client through when provided', async () => {
      const tx = {} as any;
      mockRepo.upsertAddons.mockResolvedValue([] as any);

      await service.upsertAddons(1, [], 3, tx);

      expect(mockRepo.upsertAddons).toHaveBeenCalledWith(1, [], 3, tx);
    });

    it('should skip validation and call repo when addons is empty', async () => {
      mockRepo.upsertAddons.mockResolvedValue([] as any);

      await service.upsertAddons(1, [], 3);

      expect(mockRepo.upsertAddons).toHaveBeenCalled();
    });
  });

  describe('removeAddons', () => {
    it('should delegate to the repository', async () => {
      mockRepo.removeAddons.mockResolvedValue(undefined as any);

      await service.removeAddons(1, [10, 11], 3);

      expect(mockRepo.removeAddons).toHaveBeenCalledWith(1, [10, 11], 3, undefined);
    });
  });
});
