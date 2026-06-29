import { Response, NextFunction } from 'express';
import { BundleService } from '../../subscription/services/bundle.service';
import { CoinMapper } from '../../subscription/mappers/coin.mapper';
import { successResponse } from '../utils/response.util';
import type { AuthenticatedRequest } from '../types/typed-request';

/**
 * Shared read-only bundle controller.
 * Exposes active bundles to both client and subscription modules.
 */
export class SharedBundleController {
  constructor(private readonly bundleService: BundleService) {}

  getActiveBundles = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Use a large limit to return all active bundles
      const { data } = await this.bundleService.getAllBundles(undefined, 1, 100);
      const activeBundles = data.filter((b) => b.is_active);
      res
        .status(200)
        .json(successResponse(activeBundles.map((b) => CoinMapper.toBundleResponse(b))));
    } catch (error) {
      next(error);
    }
  };
}
