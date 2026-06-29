import { TaxService } from '../../../shared/services/tax.service';
import { TaxRepository } from '../../../shared/repositories/tax.repository';
import { AppError } from '../../../shared/middlewares/error.middleware';

describe('TaxService', () => {
  let taxService: TaxService;
  let mockTaxRepository: jest.Mocked<TaxRepository>;

  const mockTax = {
    id: 1,
    name: 'PPN',
    rate: '11',
    is_active: true,
    created_at: new Date(),
    created_by: 1,
    updated_at: new Date(),
    updated_by: 1,
    deleted_at: null,
    deleted_by: null,
  };

  beforeEach(() => {
    mockTaxRepository = {
      createTax: jest.fn(),
      findAllTaxes: jest.fn(),
      findActiveTax: jest.fn(),
      findTaxById: jest.fn(),
      updateTax: jest.fn(),
      activateTax: jest.fn(),
      removeTax: jest.fn(),
    } as unknown as jest.Mocked<TaxRepository>;

    taxService = new TaxService(mockTaxRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTax', () => {
    it('should create a tax injecting created_by/updated_by from adminId', async () => {
      mockTaxRepository.createTax.mockResolvedValue(mockTax as any);

      const result = await taxService.createTax({ name: 'PPN', rate: '11' } as any, 7);

      expect(mockTaxRepository.createTax).toHaveBeenCalledWith({
        name: 'PPN',
        rate: '11',
        created_by: 7,
        updated_by: 7,
      });
      expect(result).toEqual(mockTax);
    });

    it('should translate a P2002 unique-constraint error into a 409 DUPLICATE_TAX AppError', async () => {
      mockTaxRepository.createTax.mockRejectedValue({ code: 'P2002' });

      await expect(taxService.createTax({ name: 'PPN' } as any, 1)).rejects.toThrow(AppError);
      await expect(taxService.createTax({ name: 'PPN' } as any, 1)).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_TAX',
      });
    });

    it('should rethrow unknown errors as-is', async () => {
      const err = new Error('db down');
      mockTaxRepository.createTax.mockRejectedValue(err);

      await expect(taxService.createTax({ name: 'PPN' } as any, 1)).rejects.toBe(err);
    });
  });

  describe('getAllTaxes', () => {
    it('should return a paginated result with meta', async () => {
      mockTaxRepository.findAllTaxes.mockResolvedValue({ data: [mockTax], total: 1 } as any);

      const result = await taxService.getAllTaxes('PPN', 1, 10);

      expect(mockTaxRepository.findAllTaxes).toHaveBeenCalledWith('PPN', 1, 10);
      expect(result.data).toEqual([mockTax]);
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10, total_pages: 1 });
    });

    it('should default page and limit when not provided', async () => {
      mockTaxRepository.findAllTaxes.mockResolvedValue({ data: [], total: 0 } as any);

      await taxService.getAllTaxes();

      expect(mockTaxRepository.findAllTaxes).toHaveBeenCalledWith(undefined, 1, 10);
    });
  });

  describe('getActiveTax', () => {
    it('should return the active tax from the repository', async () => {
      mockTaxRepository.findActiveTax.mockResolvedValue(mockTax as any);

      const result = await taxService.getActiveTax();

      expect(result).toEqual(mockTax);
    });

    it('should return null when no active tax exists', async () => {
      mockTaxRepository.findActiveTax.mockResolvedValue(null);

      expect(await taxService.getActiveTax()).toBeNull();
    });
  });

  describe('getTaxById', () => {
    it('should return the tax when found', async () => {
      mockTaxRepository.findTaxById.mockResolvedValue(mockTax as any);

      const result = await taxService.getTaxById(1);

      expect(mockTaxRepository.findTaxById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTax);
    });

    it('should throw 404 TAX_NOT_FOUND when missing', async () => {
      mockTaxRepository.findTaxById.mockResolvedValue(null);

      await expect(taxService.getTaxById(999)).rejects.toMatchObject({
        statusCode: 404,
        code: 'TAX_NOT_FOUND',
        message: 'Tax configuration with ID 999 not found.',
      });
    });
  });

  describe('updateTax', () => {
    it('should verify existence then update with updated_by', async () => {
      mockTaxRepository.findTaxById.mockResolvedValue(mockTax as any);
      mockTaxRepository.updateTax.mockResolvedValue({ ...mockTax, rate: '12' } as any);

      const result = await taxService.updateTax(1, { rate: '12' } as any, 9);

      expect(mockTaxRepository.findTaxById).toHaveBeenCalledWith(1);
      expect(mockTaxRepository.updateTax).toHaveBeenCalledWith(1, { rate: '12', updated_by: 9 });
      expect(result.rate).toBe('12');
    });

    it('should throw 404 if the tax does not exist before updating', async () => {
      mockTaxRepository.findTaxById.mockResolvedValue(null);

      await expect(taxService.updateTax(5, { rate: '12' } as any, 1)).rejects.toMatchObject({
        statusCode: 404,
        code: 'TAX_NOT_FOUND',
      });
      expect(mockTaxRepository.updateTax).not.toHaveBeenCalled();
    });

    it('should translate P2002 into a 409 DUPLICATE_TAX AppError', async () => {
      mockTaxRepository.findTaxById.mockResolvedValue(mockTax as any);
      mockTaxRepository.updateTax.mockRejectedValue({ code: 'P2002' });

      await expect(taxService.updateTax(1, { rate: '12' } as any, 1)).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_TAX',
      });
    });
  });

  describe('activateTax', () => {
    it('should verify existence then activate', async () => {
      mockTaxRepository.findTaxById.mockResolvedValue(mockTax as any);
      mockTaxRepository.activateTax.mockResolvedValue(mockTax as any);

      await taxService.activateTax(1, 3);

      expect(mockTaxRepository.activateTax).toHaveBeenCalledWith(1, 3);
    });

    it('should throw 404 when activating a missing tax', async () => {
      mockTaxRepository.findTaxById.mockResolvedValue(null);

      await expect(taxService.activateTax(1, 3)).rejects.toMatchObject({ statusCode: 404 });
      expect(mockTaxRepository.activateTax).not.toHaveBeenCalled();
    });
  });

  describe('removeTax', () => {
    it('should verify existence then soft-remove', async () => {
      mockTaxRepository.findTaxById.mockResolvedValue(mockTax as any);
      mockTaxRepository.removeTax.mockResolvedValue(undefined as any);

      await taxService.removeTax(1, 4);

      expect(mockTaxRepository.removeTax).toHaveBeenCalledWith(1, 4);
    });

    it('should throw 404 when removing a missing tax', async () => {
      mockTaxRepository.findTaxById.mockResolvedValue(null);

      await expect(taxService.removeTax(1, 4)).rejects.toMatchObject({ statusCode: 404 });
      expect(mockTaxRepository.removeTax).not.toHaveBeenCalled();
    });
  });
});
