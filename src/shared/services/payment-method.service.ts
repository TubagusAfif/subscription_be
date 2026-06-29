import { AppError } from '../middlewares/error.middleware';
import { PaymentMethodRepository } from '../repositories/payment-method.repository';
import { Prisma, PaymentMethod } from '@prisma/client';
import { PaginatedResult } from '../types/pagination.types';
import { paginate } from '../utils/pagination.util';

export class PaymentMethodService {
  constructor(private readonly paymentMethodRepository: PaymentMethodRepository) {}

  async createPaymentMethod(
    data: Prisma.PaymentMethodCreateInput,
    adminId: number,
  ): Promise<PaymentMethod> {
    try {
      return await this.paymentMethodRepository.create({
        ...data,
        created_by: adminId,
        updated_by: adminId,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError(
          'DUPLICATE_PAYMENT_METHOD',
          'A payment method with this code already exists.',
          409,
        );
      }
      throw error;
    }
  }

  async getAllPaymentMethods(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<PaymentMethod>> {
    const { data, total } = await this.paymentMethodRepository.findAll(search, page, limit);
    return paginate(data, total, page, limit);
  }

  async getActivePaymentMethods(): Promise<PaymentMethod[]> {
    return this.paymentMethodRepository.findActive();
  }

  async getPaymentMethodById(id: number): Promise<PaymentMethod> {
    const pm = await this.paymentMethodRepository.findById(id);
    if (!pm) {
      throw new AppError(
        'PAYMENT_METHOD_NOT_FOUND',
        `Payment method with ID ${id} not found.`,
        404,
      );
    }
    return pm;
  }

  async updatePaymentMethod(
    id: number,
    data: Prisma.PaymentMethodUpdateInput,
    adminId: number,
  ): Promise<PaymentMethod> {
    await this.getPaymentMethodById(id); // verify existence
    try {
      return await this.paymentMethodRepository.update(id, {
        ...data,
        updated_by: adminId,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError(
          'DUPLICATE_PAYMENT_METHOD',
          'A payment method with this code already exists.',
          409,
        );
      }
      throw error;
    }
  }

  async removePaymentMethod(id: number, adminId: number): Promise<void> {
    await this.getPaymentMethodById(id);
    await this.paymentMethodRepository.removeSoft(id, adminId);
  }
}
