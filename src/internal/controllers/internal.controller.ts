import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../shared/utils/response.util';
import {
  slotAssignSchema,
  slotReleaseSchema,
  renewalUrlSchema,
} from '../validations/internal.validation';
import { AppError } from '../../shared/middlewares/error.middleware';
import { InternalService } from '../services/internal.service';

export class InternalController {
  constructor(private internalService: InternalService) {}

  /**
   * POST /api/internal/v1/slots/assign
   *
   * Called by Domain 2 when owner creates a new clinic/staff/doctor.
   * Uses transactional locking (FOR UPDATE) to prevent race conditions.
   * Returns 409 if quota exceeded.
   */
  slotAssign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = slotAssignSchema.parse(req.body);

      const result = await this.internalService.slotAssign({
        external_subscription_id: parsed.external_subscription_id,
        resource_type: parsed.resource_type,
        ref_type: parsed.ref_type,
        ref_id: parsed.ref_id,
      });

      res.status(200).json(successResponse(result));
    } catch (error) {
      if (error instanceof AppError) {
        if (error.code === 'QUOTA_EXCEEDED') {
          // Return 409 with quota details
          const quotaResourceType = req.body?.resource_type?.toLowerCase() ?? '';
          const quota = await this.internalService.getQuotaDetails(
            req.body?.external_subscription_id,
            quotaResourceType,
          );

          res.status(409).json({
            success: false,
            error_code: 'QUOTA_EXCEEDED',
            message: error.message,
            data: {
              resource_type: req.body?.resource_type,
              max_quota: quota?.total_quota,
              used_quota: quota?.used_quota,
            },
          });
          return;
        }
        res.status(error.statusCode).json({
          success: false,
          error_code: error.code,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  };

  /**
   * POST /api/internal/v1/slots/release
   *
   * Called by Domain 2 when owner deletes a clinic/staff/doctor.
   * IDEMPOTENT: if slot doesn't exist, still returns 200.
   */
  slotRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = slotReleaseSchema.parse(req.body);

      const result = await this.internalService.slotRelease({
        external_subscription_id: parsed.external_subscription_id,
        resource_type: parsed.resource_type,
        ref_id: parsed.ref_id,
      });

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/internal/v1/subscriptions/by-company/:external_subscription_id
   *
   * Returns full subscription snapshot in subscription.sync format.
   * Domain 2 uses this for re-sync, reconciliation, or startup.
   */
  getSubscriptionByCompany = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const externalSubscriptionId = req.params.external_subscription_id as string;

      const syncPayload =
        await this.internalService.getSubscriptionByCompany(externalSubscriptionId);

      res.status(200).json(successResponse(syncPayload));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/internal/v1/billing/renewal-url
   *
   * Generates a one-time, short-lived (30 min) checkout URL.
   * Domain 2 calls this when user clicks "Perpanjang" button.
   */
  generateRenewalUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = renewalUrlSchema.parse(req.body);

      const result = await this.internalService.generateRenewalUrl({
        external_subscription_id: parsed.external_subscription_id,
        return_url: parsed.return_url,
      });

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };
}
