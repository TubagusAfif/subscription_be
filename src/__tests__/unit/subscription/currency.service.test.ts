import { CurrencyService } from '../../../subscription/services/currency.service';
import { CurrencyRepository } from '../../../subscription/repositories/currency.repository';
import { AppError } from '../../../shared/middlewares/error.middleware';

describe('CurrencyService', () => {
  let service: CurrencyService;
  let mockRepo: jest.Mocked<CurrencyRepository>;

  const mockCurrency = { id: 1, code: 'COIN', conversion_rate: 1000, is_active: true };

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findActive: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      activate: jest.fn(),
      removeSoft: jest.fn(),
    } as unknown as jest.Mocked<CurrencyRepository>;

    service = new CurrencyService(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCurrency', () => {
    it('should create with created_by/updated_by from adminId', async () => {
      mockRepo.create.mockResolvedValue(mockCurrency as any);

      const result = await service.createCurrency({ code: 'COIN' } as any, 4);

      expect(mockRepo.create).toHaveBeenCalledWith({ code: 'COIN', created_by: 4, updated_by: 4 });
      expect(result).toEqual(mockCurrency);
    });

    it('should translate P2002 into 409 DUPLICATE_CURRENCY', async () => {
      mockRepo.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.createCurrency({} as any, 1)).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_CURRENCY',
      });
    });

    it('should rethrow unknown errors', async () => {
      const err = new Error('boom');
      mockRepo.create.mockRejectedValue(err);

      await expect(service.createCurrency({} as any, 1)).rejects.toBe(err);
    });
  });

  describe('getAllCurrencies', () => {
    it('should return a paginated result', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [mockCurrency], total: 1 } as any);

      const result = await service.getAllCurrencies('coin', 1, 10);

      expect(mockRepo.findAll).toHaveBeenCalledWith('coin', 1, 10);
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
    });

    it('should default page and limit', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0 } as any);
      await service.getAllCurrencies();
      expect(mockRepo.findAll).toHaveBeenCalledWith(undefined, 1, 10);
    });
  });

  describe('getActiveCurrency', () => {
    it('should return the active currency', async () => {
      mockRepo.findActive.mockResolvedValue(mockCurrency as any);
      expect(await service.getActiveCurrency()).toEqual(mockCurrency);
    });

    it('should return null when none active', async () => {
      mockRepo.findActive.mockResolvedValue(null);
      expect(await service.getActiveCurrency()).toBeNull();
    });
  });

  describe('getCurrencyById', () => {
    it('should return the currency when found', async () => {
      mockRepo.findById.mockResolvedValue(mockCurrency as any);
      expect(await service.getCurrencyById(1)).toEqual(mockCurrency);
    });

    it('should throw 404 CURRENCY_NOT_FOUND when missing', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getCurrencyById(9)).rejects.toMatchObject({
        statusCode: 404,
        code: 'CURRENCY_NOT_FOUND',
        message: 'Currency with ID 9 not found.',
      });
    });
  });

  describe('updateCurrency', () => {
    it('should verify existence then update with updated_by', async () => {
      mockRepo.findById.mockResolvedValue(mockCurrency as any);
      mockRepo.update.mockResolvedValue({ ...mockCurrency, conversion_rate: 2000 } as any);

      await service.updateCurrency(1, { conversion_rate: 2000 } as any, 5);

      expect(mockRepo.update).toHaveBeenCalledWith(1, { conversion_rate: 2000, updated_by: 5 });
    });

    it('should throw 404 if currency missing', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.updateCurrency(1, {} as any, 5)).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should translate P2002 into 409 DUPLICATE_CURRENCY', async () => {
      mockRepo.findById.mockResolvedValue(mockCurrency as any);
      mockRepo.update.mockRejectedValue({ code: 'P2002' });
      await expect(service.updateCurrency(1, {} as any, 5)).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_CURRENCY',
      });
    });
  });

  describe('activateCurrency', () => {
    it('should verify existence then activate', async () => {
      mockRepo.findById.mockResolvedValue(mockCurrency as any);
      mockRepo.activate.mockResolvedValue(mockCurrency as any);

      await service.activateCurrency(1, 3);

      expect(mockRepo.activate).toHaveBeenCalledWith(1, 3);
    });

    it('should throw 404 when activating a missing currency', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.activateCurrency(1, 3)).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.activate).not.toHaveBeenCalled();
    });
  });

  describe('removeCurrency', () => {
    it('should verify existence then soft-remove', async () => {
      mockRepo.findById.mockResolvedValue(mockCurrency as any);
      mockRepo.removeSoft.mockResolvedValue(undefined as any);

      await service.removeCurrency(1, 2);

      expect(mockRepo.removeSoft).toHaveBeenCalledWith(1, 2);
    });

    it('should throw 404 when removing a missing currency', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.removeCurrency(1, 2)).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.removeSoft).not.toHaveBeenCalled();
    });
  });
});
