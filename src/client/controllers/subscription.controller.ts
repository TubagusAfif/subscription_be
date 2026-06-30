import { Response, NextFunction } from 'express';
import { ClientSubscriptionService } from '../services/subscription.service';
import { SubscriptionMapper } from '../mappers/subscription.mapper';
import { successResponse } from '../../shared/utils/response.util';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';
import type {
  SubscribeBody,
  SwitchPlanBody,
} from '../../shared/validations/subscription.validation';

export interface ClientSubscriptionControllerDeps {
  subscriptionService: ClientSubscriptionService;
}

export class ClientSubscriptionController {
  private readonly subscriptionService: ClientSubscriptionService;

  constructor(deps: ClientSubscriptionControllerDeps) {
    this.subscriptionService = deps.subscriptionService;
  }

  subscribe = async (
    req: AuthenticatedRequest<SubscribeBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { sku_id } = req.body;
      const subscription = await this.subscriptionService.subscribe(Number(req.user.sub), sku_id);
      res.status(201).json(successResponse(SubscriptionMapper.toResponse(subscription)));
    } catch (error) {
      next(error);
    }
  };

  getMySubscription = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = Number(req.user.sub);

      // get subscription
      const subscription = await this.subscriptionService.getMySubscription(userId);

      let responseData = null;

      if (subscription) {
        // call get addons value
        const addons = await this.subscriptionService.getMyAddons(userId);

        // breakdown list clinic and user, i mean we need to show the source of accumulation quota + usage
        const slotDetails = await this.subscriptionService.getSlotDetails(userId, ['clinic', 'user']);

        responseData = {
          ...SubscriptionMapper.toDetailResponse(subscription),
          addons: addons.map((addon) => SubscriptionMapper.toDetailResponse(addon)),
          slots: slotDetails,
        };
      }

      res.status(200).json(successResponse(responseData));
    } catch (error) {
      next(error);
    }
  };

  getMySubscriptions = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const subscriptions = await this.subscriptionService.getMySubscriptions(Number(req.user.sub));
      res
        .status(200)
        .json(successResponse(subscriptions.map((s) => SubscriptionMapper.toResponse(s))));
    } catch (error) {
      next(error);
    }
  };

  cancelSubscription = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const subscription = await this.subscriptionService.cancelSubscription(
        Number(req.user.sub),
        Number(req.params.id),
      );
      res.status(200).json(successResponse(SubscriptionMapper.toResponse(subscription)));
    } catch (error) {
      next(error);
    }
  };

  switchPlan = async (
    req: AuthenticatedRequest<SwitchPlanBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const subscriptionId = Number(req.params.id);
      const { new_sku_id } = req.body;

      const newSubscription = await this.subscriptionService.switchPlan(
        Number(req.user.sub),
        subscriptionId,
        Number(new_sku_id),
      );

      res.status(200).json(successResponse(SubscriptionMapper.toResponse(newSubscription)));
    } catch (error) {
      next(error);
    }
  };
}
