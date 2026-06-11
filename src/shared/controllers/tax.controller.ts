import { Response, NextFunction } from 'express';
import { TaxService } from '../services/tax.service';
import { TaxMapper } from '../mappers/tax.mapper';
import { successResponse } from '../utils/response.util';
import type { AuthenticatedRequest } from '../types/typed-request';

export interface SharedTaxControllerDeps {
  taxService: TaxService;
}

export class SharedTaxController {
  private readonly taxService: TaxService;

  constructor(deps: SharedTaxControllerDeps) {
    this.taxService = deps.taxService;
  }

  getActiveTax = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tax = await this.taxService.getActiveTax();
      res
        .status(200)
        .json(
          successResponse({ tax: tax ? TaxMapper.toResponse(tax) : null }),
        );
    } catch (error) {
      next(error);
    }
  };
}
