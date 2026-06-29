import { FeatureService } from '../../../subscription/services/feature.service';
import { FeatureRepository } from '../../../subscription/repositories/feature.repository';

describe('FeatureService', () => {
  let service: FeatureService;
  let mockRepo: jest.Mocked<FeatureRepository>;

  beforeEach(() => {
    mockRepo = {
      upsertFeatures: jest.fn(),
      removeFeatures: jest.fn(),
    } as unknown as jest.Mocked<FeatureRepository>;

    service = new FeatureService(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertFeatures', () => {
    it('should delegate to the repository and return the result', async () => {
      const features = [{ feature_name: 'X-Ray' }];
      mockRepo.upsertFeatures.mockResolvedValue(features as any);

      const result = await service.upsertFeatures(1, features, 2);

      expect(mockRepo.upsertFeatures).toHaveBeenCalledWith(1, features, 2, undefined);
      expect(result).toEqual(features);
    });

    it('should forward the transaction client when provided', async () => {
      const tx = {} as any;
      mockRepo.upsertFeatures.mockResolvedValue([] as any);

      await service.upsertFeatures(1, [], 2, tx);

      expect(mockRepo.upsertFeatures).toHaveBeenCalledWith(1, [], 2, tx);
    });
  });

  describe('removeFeatures', () => {
    it('should delegate to the repository', async () => {
      mockRepo.removeFeatures.mockResolvedValue(undefined as any);

      await service.removeFeatures(1, [7, 8], 2);

      expect(mockRepo.removeFeatures).toHaveBeenCalledWith(1, [7, 8], 2, undefined);
    });
  });
});
