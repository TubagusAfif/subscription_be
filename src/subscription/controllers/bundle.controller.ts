import { Response, NextFunction } from 'express';
import { BundleService } from '../services/bundle.service';
import { CurrencyService } from '../services/currency.service';
import { CoinMapper } from '../mappers/coin.mapper';
import { successResponse } from '../../shared/utils/response.util';
import { stripUndefined } from '../../shared/utils/strip-undefined.util';
import { AppError } from '../../shared/middlewares/error.middleware';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';
import type { CreateBundleBody, UpdateBundleBody } from '../../shared/validations/coin.validation';
import { TaxService } from '../../shared/services/tax.service';

export interface BundleControllerDeps {
  bundleService: BundleService;
  currencyService: CurrencyService;
  taxService: TaxService;
}

export class BundleController {
  private readonly bundleService: BundleService;
  private readonly currencyService: CurrencyService;
  private readonly taxService: TaxService;

  constructor(deps: BundleControllerDeps) {
    this.bundleService = deps.bundleService;
    this.currencyService = deps.currencyService;
    this.taxService = deps.taxService;
  }

  createBundle = async (req: AuthenticatedRequest<CreateBundleBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = stripUndefined(req.body);
      const currency = await this.currencyService.getCurrencyById(body.currency_id);

      const tax = await this.taxService.getActiveTax();

      if (!currency.is_active) {
        throw new AppError('CURRENCY_INACTIVE', `This Currency is inactive.`, 404);
      }

      const calculatedPrice = Number(body.coin_amount) * Number(currency.conversion_rate);

      if (body.discounted_price !== undefined && body.discounted_price !== null && body.discounted_price >= calculatedPrice) {
        throw new AppError('INVALID_DISCOUNT_PRICE', 'Discounted price must be less than regular price.', 400);
      }

      const payload = {
        ...body,
        tax_rate: tax?.tax_value || 0,
        price: calculatedPrice,
        currency: { connect: { id: body.currency_id } },
      };
      delete (payload as any).currency_id;

      const bundle = await this.bundleService.createBundle(payload, Number(req.user.sub));
      res.status(201).json(successResponse(CoinMapper.toBundleResponse(bundle)));
    } catch (error) {
      next(error);
    }
  };

  getAllBundles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const { data, meta } = await this.bundleService.getAllBundles(search, page, limit);
      res
        .status(200)
        .json(successResponse(data.map((b) => CoinMapper.toBundleResponse(b)), meta));
    } catch (error) {
      next(error);
    }
  };

  getBundleById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bundle = await this.bundleService.getBundleById(Number(req.params.id));
      res.status(200).json(successResponse(CoinMapper.toBundleResponse(bundle)));
    } catch (error) {
      next(error);
    }
  };

  updateBundle = async (req: AuthenticatedRequest<UpdateBundleBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = { ...req.body } as any;
      const bundleId = Number(req.params.id);
      const existingBundle = await this.bundleService.getBundleById(bundleId);
      const tax = await this.taxService.getActiveTax();

      let taxRate = existingBundle.tax_rate || 0;
      let currencyId = existingBundle.currency_id;
      let coinAmount = existingBundle.coin_amount;

      if (tax) {
        taxRate = tax.tax_value;
      }

      if (payload.currency_id !== undefined) {
        currencyId = payload.currency_id;
        payload.currency = { connect: { id: payload.currency_id } };
        delete payload.currency_id;
      }

      if (payload.coin_amount !== undefined) {
        coinAmount = payload.coin_amount;
      }

      const currency = await this.currencyService.getCurrencyById(currencyId);

      if (!currency.is_active) {
        throw new AppError('CURRENCY_INACTIVE', `This Currency is inactive.`, 404);
      }

      const calculatedPrice = Number(coinAmount) * Number(currency.conversion_rate);

      let newDiscountedPrice = payload.discounted_price !== undefined ? payload.discounted_price : existingBundle.discounted_price;
      if (newDiscountedPrice !== undefined && newDiscountedPrice !== null && newDiscountedPrice >= calculatedPrice) {
        throw new AppError('INVALID_DISCOUNT_PRICE', 'Discounted price must be less than regular price.', 400);
      }

      payload.price = calculatedPrice;
      payload.tax_rate = taxRate;

      const bundle = await this.bundleService.updateBundle(
        bundleId,
        payload,
        Number(req.user.sub),
      );
      res.status(200).json(successResponse(CoinMapper.toBundleResponse(bundle)));
    } catch (error) {
      next(error);
    }
  };

  removeBundle = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.bundleService.removeBundle(Number(req.params.id), Number(req.user.sub));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
