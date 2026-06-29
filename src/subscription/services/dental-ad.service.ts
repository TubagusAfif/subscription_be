import { DentalAdRepository } from '../repositories/dental-ad.repository';
import { AppError } from '../../shared/middlewares/error.middleware';
import { paginate } from '../../shared/utils/pagination.util';
import { PaginatedResult } from '../../shared/types/pagination.types';
import { DentalAd } from '@prisma/client';

export class DentalAdService {
  constructor(private readonly dentalAdRepo: DentalAdRepository) {}

  async create(data: { name: string; category: string; image_path: string }, adminId: number) {
    return this.dentalAdRepo.create({
      ...data,
      created_by: adminId,
      updated_by: adminId,
    });
  }

  async findAll(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<DentalAd>> {
    const { data, total } = await this.dentalAdRepo.findAll(search, page, limit);
    return paginate(data, total, page, limit);
  }

  async findById(id: number) {
    const ad = await this.dentalAdRepo.findById(id);
    if (!ad) {
      throw new AppError('NOT_FOUND', 'Dental ad not found', 404);
    }
    return ad;
  }

  async update(
    id: number,
    data: { name?: string; category?: string; image_path?: string },
    adminId: number,
  ) {
    const ad = await this.dentalAdRepo.findById(id);
    if (!ad) {
      throw new AppError('NOT_FOUND', 'Dental ad not found', 404);
    }

    return this.dentalAdRepo.update(id, {
      ...data,
      updated_by: adminId,
    });
  }

  async remove(id: number, adminId: number) {
    const ad = await this.dentalAdRepo.findById(id);
    if (!ad) {
      throw new AppError('NOT_FOUND', 'Dental ad not found', 404);
    }

    return this.dentalAdRepo.softDelete(id, adminId);
  }
}
