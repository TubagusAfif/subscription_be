import { Request, Response, NextFunction } from 'express';
import { InternalController } from '../../../shared/controllers/internal.controller';
import { InternalService } from '../../../shared/services/internal.service';
import { AppError } from '../../../shared/middlewares/error.middleware';
import { ZodError } from 'zod';

describe('InternalController', () => {
  let controller: InternalController;
  let mockInternalService: jest.Mocked<InternalService>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    mockInternalService = {
      slotAssign: jest.fn(),
      slotRelease: jest.fn(),
      getSubscriptionByCompany: jest.fn(),
      generateRenewalUrl: jest.fn(),
      getQuotaDetails: jest.fn(),
    } as unknown as jest.Mocked<InternalService>;

    controller = new InternalController(mockInternalService);

    req = {
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('slotAssign', () => {
    it('should assign a slot and return 200 on success', async () => {
      req.body = {
        external_subscription_id: 'sub_123',
        resource_type: 'CLINIC',
        ref_type: 'clinic',
        ref_id: 1,
        assigned_at: '2026-06-03T00:00:00.000Z',
      };

      const mockResult = {
        resource_type: 'CLINIC',
        used_quota: 1,
        total_quota: 2,
      };

      mockInternalService.slotAssign.mockResolvedValue(mockResult);

      await controller.slotAssign(req as Request, res as Response, next);

      expect(mockInternalService.slotAssign).toHaveBeenCalledWith({
        external_subscription_id: 'sub_123',
        resource_type: 'CLINIC',
        ref_type: 'clinic',
        ref_id: 1,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return 409 QUOTA_EXCEEDED when quota is full', async () => {
      req.body = {
        external_subscription_id: 'sub_123',
        resource_type: 'CLINIC',
        ref_type: 'clinic',
        ref_id: 1,
        assigned_at: '2026-06-03T00:00:00.000Z',
      };

      const error = new AppError('QUOTA_EXCEEDED', 'Quota exceeded', 409);
      mockInternalService.slotAssign.mockRejectedValue(error);
      mockInternalService.getQuotaDetails.mockResolvedValue({ total_quota: 2, used_quota: 2 });

      await controller.slotAssign(req as Request, res as Response, next);

      expect(mockInternalService.getQuotaDetails).toHaveBeenCalledWith('sub_123', 'clinic');
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error_code: 'QUOTA_EXCEEDED',
        message: 'Quota exceeded',
        data: {
          resource_type: 'CLINIC',
          max_quota: 2,
          used_quota: 2,
        },
      });
    });

    it('should pass ZodError to next()', async () => {
      req.body = {
        // missing required fields
      };

      await controller.slotAssign(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ZodError));
    });

    it('should pass other AppError directly', async () => {
      req.body = {
        external_subscription_id: 'sub_123',
        resource_type: 'CLINIC',
        ref_type: 'clinic',
        ref_id: 1,
        assigned_at: '2026-06-03T00:00:00.000Z',
      };

      const error = new AppError('NOT_FOUND', 'Not found', 404);
      mockInternalService.slotAssign.mockRejectedValue(error);

      await controller.slotAssign(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error_code: 'NOT_FOUND',
        message: 'Not found',
      });
    });
  });

  describe('slotRelease', () => {
    it('should release a slot and return 200 on success', async () => {
      req.body = {
        external_subscription_id: 'sub_123',
        resource_type: 'CLINIC',
        ref_id: 1,
      };

      const mockResult = { success: true };
      mockInternalService.slotRelease.mockResolvedValue(mockResult);

      await controller.slotRelease(req as Request, res as Response, next);

      expect(mockInternalService.slotRelease).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should pass error to next()', async () => {
      req.body = {
        external_subscription_id: 'sub_123',
        resource_type: 'CLINIC',
        ref_id: 1,
      };

      const error = new Error('Test error');
      mockInternalService.slotRelease.mockRejectedValue(error);

      await controller.slotRelease(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getSubscriptionByCompany', () => {
    it('should return subscription data with 200 status', async () => {
      req.params = {
        external_subscription_id: 'sub_123',
      };

      const mockPayload = {
        event: 'subscription.sync',
        data: { company_id: 1, external_subscription_id: 'sub_123' },
      };
      mockInternalService.getSubscriptionByCompany.mockResolvedValue(mockPayload as any);

      await controller.getSubscriptionByCompany(req as Request, res as Response, next);

      expect(mockInternalService.getSubscriptionByCompany).toHaveBeenCalledWith('sub_123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPayload,
      });
    });

    it('should pass error to next()', async () => {
      req.params = {
        external_subscription_id: 'sub_123',
      };

      const error = new Error('Test error');
      mockInternalService.getSubscriptionByCompany.mockRejectedValue(error);

      await controller.getSubscriptionByCompany(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('generateRenewalUrl', () => {
    it('should generate url and return 200 on success', async () => {
      req.body = {
        external_subscription_id: 'sub_123',
        return_url: 'https://example.com/return',
      };

      const mockResult = { url: 'https://checkout.example.com' };
      mockInternalService.generateRenewalUrl.mockResolvedValue(mockResult);

      await controller.generateRenewalUrl(req as Request, res as Response, next);

      expect(mockInternalService.generateRenewalUrl).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should pass error to next()', async () => {
      req.body = {
        external_subscription_id: 'sub_123',
        return_url: 'https://example.com/return',
      };

      const error = new Error('Test error');
      mockInternalService.generateRenewalUrl.mockRejectedValue(error);

      await controller.generateRenewalUrl(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
