import { Response, NextFunction } from 'express';
import { CurrencyService } from '../../subscription/services/currency.service';
import { CoinMapper } from '../../subscription/mappers/coin.mapper';
import { successResponse } from '../utils/response.util';
import type { AuthenticatedRequest } from '../types/typed-request';

/**
 * Shared read-only currency controller.
 * Exposes the active currency to both client and subscription modules.
 */
export class SharedCurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  getActiveCurrency = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currency = await this.currencyService.getActiveCurrency();
      res.status(200).json(successResponse(currency ? CoinMapper.toCurrencyResponse(currency) : null));
    } catch (error) {
      next(error);
    }
  };
}
