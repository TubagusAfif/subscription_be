import { DentalAdService } from '../../../subscription/services/dental-ad.service';
import { DentalAdRepository } from '../../../subscription/repositories/dental-ad.repository';
import { AppError } from '../../../shared/middlewares/error.middleware';

describe('DentalAdService', () => {
  let service: DentalAdService;
  let mockRepo: jest.Mocked<DentalAdRepository>;

  const mockAd = { id: 1, name: 'Promo', category: 'GENERAL', image_path: '/img/a.png' };

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<DentalAdRepository>;

    service = new DentalAdService(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create with created_by/updated_by from adminId', async () => {
      mockRepo.create.mockResolvedValue(mockAd as any);

      const data = { name: 'Promo', category: 'GENERAL', image_path: '/img/a.png' };
      const result = await service.create(data, 3);

      expect(mockRepo.create).toHaveBeenCalledWith({ ...data, created_by: 3, updated_by: 3 });
      expect(result).toEqual(mockAd);
    });
  });

  describe('findAll', () => {
    it('should return a paginated result', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [mockAd], total: 1 } as any);

      const result = await service.findAll('promo', 1, 10);

      expect(mockRepo.findAll).toHaveBeenCalledWith('promo', 1, 10);
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
    });

    it('should default page and limit', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0 } as any);
      await service.findAll();
      expect(mockRepo.findAll).toHaveBeenCalledWith(undefined, 1, 10);
    });
  });

  describe('findById', () => {
    it('should return the ad when found', async () => {
      mockRepo.findById.mockResolvedValue(mockAd as any);
      expect(await service.findById(1)).toEqual(mockAd);
    });

    it('should throw 404 NOT_FOUND when missing', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById(9)).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Dental ad not found',
      });
    });
  });

  describe('update', () => {
    it('should verify existence then update with updated_by', async () => {
      mockRepo.findById.mockResolvedValue(mockAd as any);
      mockRepo.update.mockResolvedValue({ ...mockAd, name: 'New' } as any);

      await service.update(1, { name: 'New' }, 7);

      expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'New', updated_by: 7 });
    });

    it('should throw 404 if ad missing', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update(1, { name: 'x' }, 7)).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should verify existence then soft-delete', async () => {
      mockRepo.findById.mockResolvedValue(mockAd as any);
      mockRepo.softDelete.mockResolvedValue(undefined as any);

      await service.remove(1, 2);

      expect(mockRepo.softDelete).toHaveBeenCalledWith(1, 2);
    });

    it('should throw 404 when removing a missing ad', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove(1, 2)).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });
  });
});
