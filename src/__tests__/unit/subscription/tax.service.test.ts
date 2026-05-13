import { TaxService } from '../../../subscription/services/tax.service';
import { Prisma } from '@prisma/client';

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------
const mockCreateTax = jest.fn();
const mockFindAllTaxes = jest.fn();
const mockFindTaxById = jest.fn();
const mockUpdateTax = jest.fn();
const mockRemoveTax = jest.fn();

const mockTaxRepository = {
  createTax: mockCreateTax,
  findAllTaxes: mockFindAllTaxes,
  findTaxById: mockFindTaxById,
  updateTax: mockUpdateTax,
  removeTax: mockRemoveTax,
} as any;

/** 
---------------------------------------------------------------
  Unit tests for the TaxService business logic.
---------------------------------------------------------------
**/
describe('TaxService', () => {
  let service: TaxService;
  const adminId = 99;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TaxService(mockTaxRepository);
  });

  describe('Taxes', () => {
    it('should create a tax config successfully', async () => {
      const payload: Prisma.TaxConfigCreateInput = {
        tax_name: 'VAT 10%',
        rate_percent: 10.0,
        region: 'Global',
      };

      mockCreateTax.mockResolvedValue({ id: 1, ...payload });

      const result = await service.createTax(payload, adminId);

      expect(mockCreateTax).toHaveBeenCalledWith(
        expect.objectContaining({ ...payload, created_by: adminId }),
      );
      expect(result.id).toBe(1);
    });

    it('should throw TAX_NOT_FOUND if tax config does not exist for update', async () => {
      mockFindTaxById.mockResolvedValue(null);

      await expect(service.updateTax(999, {}, adminId)).rejects.toMatchObject({
        code: 'TAX_NOT_FOUND',
      });
      expect(mockUpdateTax).not.toHaveBeenCalled();
    });

    it('should throw DUPLICATE_TAX on P2002', async () => {
      const error: any = new Error('Prisma error');
      error.code = 'P2002';
      mockCreateTax.mockRejectedValue(error);

      await expect(service.createTax({} as any, adminId)).rejects.toMatchObject({
        code: 'DUPLICATE_TAX',
      });
    });
  });
});
