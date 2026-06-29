import { Response, NextFunction } from 'express';
import { TaxService } from '../../shared/services/tax.service';
import { TaxMapper } from '../../shared/mappers/tax.mapper';
import { successResponse } from '../../shared/utils/response.util';
import { stripUndefined } from '../../shared/utils/strip-undefined.util';
import type { AuthenticatedRequest } from '../../shared/types/typed-request';
import type { CreateTaxBody, UpdateTaxBody } from '../../shared/validations/tax.validation';

export interface TaxControllerDeps {
  taxService: TaxService;
}

export class TaxController {
  private readonly taxService: TaxService;

  constructor(deps: TaxControllerDeps) {
    this.taxService = deps.taxService;
  }

  createTax = async (
    req: AuthenticatedRequest<CreateTaxBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const tax = await this.taxService.createTax(stripUndefined(req.body), Number(req.user.sub));
      res.status(201).json(successResponse(TaxMapper.toResponse(tax)));
    } catch (error) {
      next(error);
    }
  };

  getAllTaxes = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const { data, meta } = await this.taxService.getAllTaxes(search, page, limit);
      res.status(200).json(
        successResponse(
          data.map((t) => TaxMapper.toResponse(t)),
          meta,
        ),
      );
    } catch (error) {
      next(error);
    }
  };

  getTaxById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const tax = await this.taxService.getTaxById(Number(req.params.id));
      res.status(200).json(successResponse(TaxMapper.toResponse(tax)));
    } catch (error) {
      next(error);
    }
  };

  updateTax = async (
    req: AuthenticatedRequest<UpdateTaxBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const tax = await this.taxService.updateTax(
        Number(req.params.id),
        stripUndefined(req.body),
        Number(req.user.sub),
      );
      res.status(200).json(successResponse(TaxMapper.toResponse(tax)));
    } catch (error) {
      next(error);
    }
  };

  removeTax = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.taxService.removeTax(Number(req.params.id), Number(req.user.sub));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  activateTax = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const tax = await this.taxService.activateTax(Number(req.params.id), Number(req.user.sub));
      res.status(200).json(successResponse(TaxMapper.toResponse(tax)));
    } catch (error) {
      next(error);
    }
  };
}
