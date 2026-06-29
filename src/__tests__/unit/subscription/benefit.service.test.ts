import { BenefitService } from '../../../subscription/services/benefit.service';
import { BenefitRepository } from '../../../subscription/repositories/benefit.repository';

describe('BenefitService', () => {
  let service: BenefitService;
  let mockRepo: jest.Mocked<BenefitRepository>;

  beforeEach(() => {
    mockRepo = {
      upsertBenefits: jest.fn(),
      removeBenefits: jest.fn(),
    } as unknown as jest.Mocked<BenefitRepository>;

    service = new BenefitService(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertBenefits', () => {
    it('should delegate to the repository and return the result', async () => {
      const benefits = [{ benefit_name: 'Free cleaning' }];
      mockRepo.upsertBenefits.mockResolvedValue(benefits as any);

      const result = await service.upsertBenefits(1, benefits, 2);

      expect(mockRepo.upsertBenefits).toHaveBeenCalledWith(1, benefits, 2, undefined);
      expect(result).toEqual(benefits);
    });

    it('should forward the transaction client when provided', async () => {
      const tx = {} as any;
      mockRepo.upsertBenefits.mockResolvedValue([] as any);

      await service.upsertBenefits(1, [], 2, tx);

      expect(mockRepo.upsertBenefits).toHaveBeenCalledWith(1, [], 2, tx);
    });
  });

  describe('removeBenefits', () => {
    it('should delegate to the repository', async () => {
      mockRepo.removeBenefits.mockResolvedValue(undefined as any);

      await service.removeBenefits(1, [5, 6], 2);

      expect(mockRepo.removeBenefits).toHaveBeenCalledWith(1, [5, 6], 2, undefined);
    });
  });
});
