import { AppError } from '../middlewares/error.middleware';
import { TaxRepository } from '../repositories/tax.repository';
import { Prisma, TaxConfig } from '@prisma/client';
import { PaginatedResult } from '../types/pagination.types';
import { paginate } from '../utils/pagination.util';

/** 
---------------------------------------------------------------
  Service for managing Tax Configurations business logic.
---------------------------------------------------------------
**/
export class TaxService {
  constructor(private readonly taxRepository: TaxRepository) {}

  async createTax(data: Prisma.TaxConfigCreateInput, adminId: number): Promise<TaxConfig> {
    try {
      return await this.taxRepository.createTax({
        ...data,
        created_by: adminId,
        updated_by: adminId,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError('DUPLICATE_TAX', 'A tax configuration conflict occurred.', 409);
      }
      throw error;
    }
  }

  async getAllTaxes(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<TaxConfig>> {
    const { data, total } = await this.taxRepository.findAllTaxes(search, page, limit);
    return paginate(data, total, page, limit);
  }

  async getActiveTax(): Promise<TaxConfig | null> {
    return this.taxRepository.findActiveTax();
  }

  async getTaxById(id: number): Promise<TaxConfig> {
    const tax = await this.taxRepository.findTaxById(id);
    if (!tax) {
      throw new AppError('TAX_NOT_FOUND', `Tax configuration with ID ${id} not found.`, 404);
    }
    return tax;
  }

  async updateTax(
    id: number,
    data: Prisma.TaxConfigUpdateInput,
    adminId: number,
  ): Promise<TaxConfig> {
    await this.getTaxById(id); // verify existence
    try {
      return await this.taxRepository.updateTax(id, {
        ...data,
        updated_by: adminId,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError('DUPLICATE_TAX', 'A tax configuration conflict occurred.', 409);
      }
      throw error;
    }
  }

  async activateTax(id: number, adminId: number): Promise<TaxConfig> {
    await this.getTaxById(id); // verify existence
    return this.taxRepository.activateTax(id, adminId);
  }

  async removeTax(id: number, adminId: number): Promise<void> {
    await this.getTaxById(id);
    await this.taxRepository.removeTax(id, adminId);
  }
}

