import { BundleService } from '../../../subscription/services/bundle.service';
import { AppError } from '../../../shared/middlewares/error.middleware';

describe('BundleService', () => {
  let service: BundleService;

  const mockBundleRepo = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    removeSoft: jest.fn(),
  };

  const mockCurrencyService = {
    getCurrencyById: jest.fn(),
  };

  const mockBundle = { id: 1, bundle_name: '100 Coins', coin_amount: 100, currency_id: 1 };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BundleService({
      bundleRepository: mockBundleRepo as any,
      currencyService: mockCurrencyService as any,
    });
  });

  describe('createBundle', () => {
    it('should validate the connected currency and create the bundle', async () => {
      mockCurrencyService.getCurrencyById.mockResolvedValue({ id: 1 });
      mockBundleRepo.create.mockResolvedValue(mockBundle as any);

      const data = { bundle_name: '100 Coins', currency: { connect: { id: 1 } } } as any;
      const result = await service.createBundle(data, 9);

      expect(mockCurrencyService.getCurrencyById).toHaveBeenCalledWith(1);
      expect(mockBundleRepo.create).toHaveBeenCalledWith({
        ...data,
        created_by: 9,
        updated_by: 9,
      });
      expect(result).toEqual(mockBundle);
    });

    it('should skip currency validation when no currency is connected', async () => {
      mockBundleRepo.create.mockResolvedValue(mockBundle as any);

      await service.createBundle({ bundle_name: '100 Coins' } as any, 9);

      expect(mockCurrencyService.getCurrencyById).not.toHaveBeenCalled();
      expect(mockBundleRepo.create).toHaveBeenCalled();
    });

    it('should propagate the currency-not-found error from currencyService', async () => {
      mockCurrencyService.getCurrencyById.mockRejectedValue(
        new AppError('CURRENCY_NOT_FOUND', 'Currency with ID 1 not found.', 404),
      );

      await expect(
        service.createBundle({ currency: { connect: { id: 1 } } } as any, 9),
      ).rejects.toMatchObject({ statusCode: 404, code: 'CURRENCY_NOT_FOUND' });
      expect(mockBundleRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllBundles', () => {
    it('should return a paginated result', async () => {
      mockBundleRepo.findAll.mockResolvedValue({ data: [mockBundle], total: 1 });

      const result = await service.getAllBundles('coin', 1, 10);

      expect(mockBundleRepo.findAll).toHaveBeenCalledWith('coin', 1, 10);
      expect(result.data).toEqual([mockBundle]);
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
    });

    it('should default page and limit', async () => {
      mockBundleRepo.findAll.mockResolvedValue({ data: [], total: 0 });

      await service.getAllBundles();

      expect(mockBundleRepo.findAll).toHaveBeenCalledWith(undefined, 1, 10);
    });
  });

  describe('getBundleById', () => {
    it('should return the bundle when found', async () => {
      mockBundleRepo.findById.mockResolvedValue(mockBundle as any);

      expect(await service.getBundleById(1)).toEqual(mockBundle);
    });

    it('should throw 404 BUNDLE_NOT_FOUND when missing', async () => {
      mockBundleRepo.findById.mockResolvedValue(null);

      await expect(service.getBundleById(77)).rejects.toMatchObject({
        statusCode: 404,
        code: 'BUNDLE_NOT_FOUND',
        message: 'Bundle with ID 77 not found.',
      });
    });
  });

  describe('updateBundle', () => {
    it('should verify existence, validate currency and update', async () => {
      mockBundleRepo.findById.mockResolvedValue(mockBundle as any);
      mockCurrencyService.getCurrencyById.mockResolvedValue({ id: 2 });
      mockBundleRepo.update.mockResolvedValue({ ...mockBundle, currency_id: 2 } as any);

      const data = { currency: { connect: { id: 2 } } } as any;
      await service.updateBundle(1, data, 4);

      expect(mockCurrencyService.getCurrencyById).toHaveBeenCalledWith(2);
      expect(mockBundleRepo.update).toHaveBeenCalledWith(1, { ...data, updated_by: 4 });
    });

    it('should throw 404 when updating a missing bundle', async () => {
      mockBundleRepo.findById.mockResolvedValue(null);

      await expect(service.updateBundle(1, {} as any, 4)).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockBundleRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('removeBundle', () => {
    it('should verify existence then soft-remove', async () => {
      mockBundleRepo.findById.mockResolvedValue(mockBundle as any);
      mockBundleRepo.removeSoft.mockResolvedValue(undefined as any);

      await service.removeBundle(1, 6);

      expect(mockBundleRepo.removeSoft).toHaveBeenCalledWith(1, 6);
    });

    it('should throw 404 when removing a missing bundle', async () => {
      mockBundleRepo.findById.mockResolvedValue(null);

      await expect(service.removeBundle(1, 6)).rejects.toMatchObject({ statusCode: 404 });
      expect(mockBundleRepo.removeSoft).not.toHaveBeenCalled();
    });
  });
});
