import { AppError } from '../../shared/middlewares/error.middleware';
import { CurrencyRepository, FormattedCoinCurrency } from '../repositories/currency.repository';
import { Prisma } from '@prisma/client';

import { PaginatedResult } from '../../shared/types/pagination.types';
import { paginate } from '../../shared/utils/pagination.util';

export class CurrencyService {
  constructor(private readonly currencyRepository: CurrencyRepository) {}

  async createCurrency(
    data: Prisma.CoinCurrencyCreateInput,
    adminId: number,
  ): Promise<FormattedCoinCurrency> {
    try {
      return await this.currencyRepository.create({
        ...data,
        created_by: adminId,
        updated_by: adminId,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError('DUPLICATE_CURRENCY', 'A currency with this code already exists.', 409);
      }
      throw error;
    }
  }

  async getAllCurrencies(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<FormattedCoinCurrency>> {
    const { data, total } = await this.currencyRepository.findAll(search, page, limit);
    return paginate(data, total, page, limit);
  }

  async getActiveCurrency(): Promise<FormattedCoinCurrency | null> {
    return this.currencyRepository.findActive();
  }

  async getCurrencyById(id: number): Promise<FormattedCoinCurrency> {
    const currency = await this.currencyRepository.findById(id);
    if (!currency) {
      throw new AppError('CURRENCY_NOT_FOUND', `Currency with ID ${id} not found.`, 404);
    }
    return currency;
  }

  async updateCurrency(
    id: number,
    data: Prisma.CoinCurrencyUpdateInput,
    adminId: number,
  ): Promise<FormattedCoinCurrency> {
    await this.getCurrencyById(id); // verify existence
    try {
      return await this.currencyRepository.update(id, {
        ...data,
        updated_by: adminId,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError('DUPLICATE_CURRENCY', 'A currency with this code already exists.', 409);
      }
      throw error;
    }
  }

  async activateCurrency(id: number, adminId: number): Promise<FormattedCoinCurrency> {
    await this.getCurrencyById(id); // verify existence
    return this.currencyRepository.activate(id, adminId);
  }

  async removeCurrency(id: number, adminId: number): Promise<void> {
    await this.getCurrencyById(id);
    await this.currencyRepository.removeSoft(id, adminId);
  }
}
