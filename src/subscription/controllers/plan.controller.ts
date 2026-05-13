import { Response, NextFunction } from 'express';
import { PlanService } from '../services/plan.service';
import { BenefitService } from '../services/benefit.service';
import { FeatureService } from '../services/feature.service';
import { AddonService } from '../services/addon.service';
import { successResponse } from '../../shared/utils/response.util';
import { stripUndefined } from '../../shared/utils/strip-undefined.util';
import { PlanMapper } from '../../shared/mappers/plan.mapper';
import { PrismaClient } from '@prisma/client';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';
import type { UpsertPlanBody } from '../../shared/validations/plan.validation';

export class PlanController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly planService: PlanService,
    private readonly benefitService: BenefitService,
    private readonly featureService: FeatureService,
    private readonly addonService: AddonService,
  ) {}

  upsertPlan = async (req: AuthenticatedRequest<UpsertPlanBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.params?.id && !req.body.id) {
        req.body.id = Number(req.params.id);
      }

      const payload = stripUndefined(req.body);
      const { benefits: payloadBenefits, features: payloadFeatures, addons: payloadAddons, removed, ...planBaseData } = payload;
      const adminId = Number(req.user.sub);

      const plan = await this.prisma.$transaction(async (tx) => {
        const upsertedPlan = await this.planService.upsertPlanBase(planBaseData, adminId, tx);

        if (removed) {
          await Promise.all([
            this.benefitService.removeBenefits(upsertedPlan.id, removed.benefits, adminId, tx),
            this.featureService.removeFeatures(upsertedPlan.id, removed.features, adminId, tx),
            this.addonService.removeAddons(upsertedPlan.id, removed.addons, adminId, tx),
          ]);
        }

        const [benefits, features, addons] = await Promise.all([
          this.benefitService.upsertBenefits(upsertedPlan.id, payloadBenefits, adminId, tx),
          this.featureService.upsertFeatures(upsertedPlan.id, payloadFeatures, adminId, tx),
          this.addonService.upsertAddons(upsertedPlan.id, payloadAddons, adminId, tx),
        ]);

        return {
          ...upsertedPlan,
          benefits,
          features,
          addons,
        };
      });
      
      const statusCode = req.body.id ? 200 : 201;
      res.status(statusCode).json(successResponse(PlanMapper.toResponse(plan)));
    } catch (error) {
      next(error);
    }
  };



  deactivatePlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.planService.deactivatePlan(Number(req.params.id), Number(req.user.sub));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
