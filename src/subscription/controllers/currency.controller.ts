import { Response, NextFunction } from 'express';
import { CurrencyService } from '../services/currency.service';
import { CoinMapper } from '../mappers/coin.mapper';
import { successResponse } from '../../shared/utils/response.util';
import { stripUndefined } from '../../shared/utils/strip-undefined.util';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';
import type { CreateCurrencyBody, UpdateCurrencyBody } from '../../shared/validations/coin.validation';

export interface CurrencyControllerDeps {
  currencyService: CurrencyService;
}

export class CurrencyController {
  private readonly currencyService: CurrencyService;

  constructor(deps: CurrencyControllerDeps) {
    this.currencyService = deps.currencyService;
  }

  createCurrency = async (req: AuthenticatedRequest<CreateCurrencyBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currency = await this.currencyService.createCurrency(stripUndefined(req.body), Number(req.user.sub));
      res.status(201).json(successResponse(CoinMapper.toCurrencyResponse(currency)));
    } catch (error) {
      next(error);
    }
  };

  getAllCurrencies = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const { data, meta } = await this.currencyService.getAllCurrencies(search, page, limit);
      res
        .status(200)
        .json(
          successResponse(data.map((c) => CoinMapper.toCurrencyResponse(c)), meta),
        );
    } catch (error) {
      next(error);
    }
  };

  getActiveCurrency = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currency = await this.currencyService.getActiveCurrency();
      res
        .status(200)
        .json(
          successResponse({ currency: currency ? CoinMapper.toCurrencyResponse(currency) : null }),
        );
    } catch (error) {
      next(error);
    }
  };

  getCurrencyById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currency = await this.currencyService.getCurrencyById(Number(req.params.id));
      res.status(200).json(successResponse(CoinMapper.toCurrencyResponse(currency)));
    } catch (error) {
      next(error);
    }
  };

  updateCurrency = async (req: AuthenticatedRequest<UpdateCurrencyBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currency = await this.currencyService.updateCurrency(
        Number(req.params.id),
        stripUndefined(req.body),
        Number(req.user.sub),
      );
      res.status(200).json(successResponse(CoinMapper.toCurrencyResponse(currency)));
    } catch (error) {
      next(error);
    }
  };

  removeCurrency = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.currencyService.removeCurrency(Number(req.params.id), Number(req.user.sub));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  activateCurrency = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currency = await this.currencyService.activateCurrency(Number(req.params.id), Number(req.user.sub));
      res.status(200).json(successResponse({ currency: CoinMapper.toCurrencyResponse(currency) }));
    } catch (error) {
      next(error);
    }
  };
}
