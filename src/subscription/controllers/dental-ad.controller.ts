import { Request, Response, NextFunction } from 'express';
import { DentalAdService } from '../services/dental-ad.service';
import { AuthenticatedRequest } from '../../shared/types/typed-request';
import { successResponse } from '../../shared/utils/response.util';

export class DentalAdController {
  constructor(private readonly dentalAdService: DentalAdService) {}

  private formatAdWithBaseUrl(ad: any, req: Request) {
    if (!ad || !ad.image_path) return ad;
    if (ad.image_path.startsWith('http')) return ad;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return {
      ...ad,
      image_path: `${baseUrl}${ad.image_path.startsWith('/') ? '' : '/'}${ad.image_path}`
    };
  }

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      const ad = await this.dentalAdService.create(data, Number(req.user.sub));

      res.status(201).json(successResponse(this.formatAdWithBaseUrl(ad, req)));
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { search, page, limit } = req.query;
      const { data, meta } = await this.dentalAdService.findAll(
        typeof search === 'string' ? search : undefined,
        page ? parseInt(page as string, 10) : 1,
        limit ? parseInt(limit as string, 10) : 10,
      );

      const formattedData = data.map(ad => this.formatAdWithBaseUrl(ad, req));
      res.status(200).json(successResponse(formattedData, meta));
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const ad = await this.dentalAdService.findById(id);

      res.status(200).json(successResponse(this.formatAdWithBaseUrl(ad, req)));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const data = req.body;
      const ad = await this.dentalAdService.update(id, data, Number(req.user.sub));

      res.status(200).json(successResponse(this.formatAdWithBaseUrl(ad, req)));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await this.dentalAdService.remove(id, Number(req.user.sub));

      res.status(200).json(successResponse(null));
    } catch (error) {
      next(error);
    }
  };
}
