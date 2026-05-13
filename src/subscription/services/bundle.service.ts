import { AppError } from '../../shared/middlewares/error.middleware';
import { BundleRepository, CoinBundleWithRelations } from '../repositories/bundle.repository';
import { CurrencyService } from './currency.service';
import { Prisma } from '@prisma/client';
import { PaginatedResult } from '../../shared/types/pagination.types';
import { paginate } from '../../shared/utils/pagination.util';

export interface BundleServiceDeps {
  bundleRepository: BundleRepository;
  currencyService: CurrencyService;
}

export class BundleService {
  private readonly bundleRepository: BundleRepository;
  private readonly currencyService: CurrencyService;

  constructor(deps: BundleServiceDeps) {
    this.bundleRepository = deps.bundleRepository;
    this.currencyService = deps.currencyService;
  }

  async createBundle(
    data: Prisma.CoinBundleCreateInput,
    adminId: number,
  ): Promise<CoinBundleWithRelations> {
    if (data.currency && data.currency.connect && data.currency.connect.id) {
      await this.currencyService.getCurrencyById(Number(data.currency.connect.id));
    }

    return this.bundleRepository.create({
      ...data,
      created_by: adminId,
      updated_by: adminId,
    });
  }

  async getAllBundles(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<CoinBundleWithRelations>> {
    const { data, total } = await this.bundleRepository.findAll(search, page, limit);
    return paginate(data, total, page, limit);
  }

  async getBundleById(id: number): Promise<CoinBundleWithRelations> {
    const bundle = await this.bundleRepository.findById(id);
    if (!bundle) {
      throw new AppError('BUNDLE_NOT_FOUND', `Bundle with ID ${id} not found.`, 404);
    }
    return bundle;
  }

  async updateBundle(
    id: number,
    data: Prisma.CoinBundleUpdateInput,
    adminId: number,
  ): Promise<CoinBundleWithRelations> {
    await this.getBundleById(id);
    if (data.currency && data.currency.connect && data.currency.connect.id) {
      await this.currencyService.getCurrencyById(Number(data.currency.connect.id));
    }

    return this.bundleRepository.update(id, {
      ...data,
      updated_by: adminId,
    });
  }

  async removeBundle(id: number, adminId: number): Promise<void> {
    await this.getBundleById(id);
    await this.bundleRepository.removeSoft(id, adminId);
  }
}
