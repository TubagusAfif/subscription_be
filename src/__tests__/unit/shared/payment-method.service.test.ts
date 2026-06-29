import { PaymentMethodService } from '../../../shared/services/payment-method.service';
import { PaymentMethodRepository } from '../../../shared/repositories/payment-method.repository';
import { AppError } from '../../../shared/middlewares/error.middleware';

describe('PaymentMethodService', () => {
  let service: PaymentMethodService;
  let mockRepo: jest.Mocked<PaymentMethodRepository>;

  const mockPm = {
    id: 1,
    name: 'Virtual Account',
    bank_mega_code: 'va',
    midtrans_code: 'va',
    fee_type: 'FIXED',
    fee_value: 4000,
    is_active: true,
    created_at: new Date(),
    created_by: 1,
    updated_at: new Date(),
    updated_by: 1,
    deleted_at: null,
    deleted_by: null,
  };

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findActive: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      removeSoft: jest.fn(),
    } as unknown as jest.Mocked<PaymentMethodRepository>;

    service = new PaymentMethodService(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentMethod', () => {
    it('should create with created_by/updated_by from adminId', async () => {
      mockRepo.create.mockResolvedValue(mockPm as any);

      const result = await service.createPaymentMethod({ name: 'Virtual Account' } as any, 5);

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'Virtual Account',
        created_by: 5,
        updated_by: 5,
      });
      expect(result).toEqual(mockPm);
    });

    it('should translate P2002 into a 409 DUPLICATE_PAYMENT_METHOD AppError', async () => {
      mockRepo.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.createPaymentMethod({} as any, 1)).rejects.toThrow(AppError);
      await expect(service.createPaymentMethod({} as any, 1)).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_PAYMENT_METHOD',
      });
    });

    it('should rethrow unknown errors', async () => {
      const err = new Error('boom');
      mockRepo.create.mockRejectedValue(err);

      await expect(service.createPaymentMethod({} as any, 1)).rejects.toBe(err);
    });
  });

  describe('getAllPaymentMethods', () => {
    it('should return paginated result', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [mockPm], total: 1 } as any);

      const result = await service.getAllPaymentMethods('va', 2, 5);

      expect(mockRepo.findAll).toHaveBeenCalledWith('va', 2, 5);
      expect(result.data).toEqual([mockPm]);
      expect(result.meta).toMatchObject({ total: 1, page: 2, limit: 5 });
    });

    it('should default page and limit', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0 } as any);

      await service.getAllPaymentMethods();

      expect(mockRepo.findAll).toHaveBeenCalledWith(undefined, 1, 10);
    });
  });

  describe('getActivePaymentMethods', () => {
    it('should return active payment methods', async () => {
      mockRepo.findActive.mockResolvedValue([mockPm] as any);

      const result = await service.getActivePaymentMethods();

      expect(result).toEqual([mockPm]);
    });
  });

  describe('getPaymentMethodById', () => {
    it('should return the payment method when found', async () => {
      mockRepo.findById.mockResolvedValue(mockPm as any);

      expect(await service.getPaymentMethodById(1)).toEqual(mockPm);
      expect(mockRepo.findById).toHaveBeenCalledWith(1);
    });

    it('should throw 404 PAYMENT_METHOD_NOT_FOUND when missing', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getPaymentMethodById(99)).rejects.toMatchObject({
        statusCode: 404,
        code: 'PAYMENT_METHOD_NOT_FOUND',
        message: 'Payment method with ID 99 not found.',
      });
    });
  });

  describe('updatePaymentMethod', () => {
    it('should verify existence then update with updated_by', async () => {
      mockRepo.findById.mockResolvedValue(mockPm as any);
      mockRepo.update.mockResolvedValue({ ...mockPm, name: 'Updated' } as any);

      const result = await service.updatePaymentMethod(1, { name: 'Updated' } as any, 8);

      expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'Updated', updated_by: 8 });
      expect(result.name).toBe('Updated');
    });

    it('should throw 404 if the payment method does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updatePaymentMethod(1, {} as any, 1)).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should translate P2002 into a 409 DUPLICATE_PAYMENT_METHOD AppError', async () => {
      mockRepo.findById.mockResolvedValue(mockPm as any);
      mockRepo.update.mockRejectedValue({ code: 'P2002' });

      await expect(service.updatePaymentMethod(1, {} as any, 1)).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_PAYMENT_METHOD',
      });
    });
  });

  describe('removePaymentMethod', () => {
    it('should verify existence then soft-remove', async () => {
      mockRepo.findById.mockResolvedValue(mockPm as any);
      mockRepo.removeSoft.mockResolvedValue(undefined as any);

      await service.removePaymentMethod(1, 2);

      expect(mockRepo.removeSoft).toHaveBeenCalledWith(1, 2);
    });

    it('should throw 404 when removing a missing payment method', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.removePaymentMethod(1, 2)).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.removeSoft).not.toHaveBeenCalled();
    });
  });
});
