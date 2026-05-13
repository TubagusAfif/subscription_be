import { AppError } from '../../shared/middlewares/error.middleware';
import { PaymentGatewayRepository } from '../repositories/payment-gateway.repository';
import { Prisma, PaymentGatewayConfig } from '@prisma/client';

/** 
---------------------------------------------------------------
  Service for managing Payment Gateway Configurations business logic.
---------------------------------------------------------------
**/
export class PaymentGatewayService {
  constructor(private readonly gatewayRepository: PaymentGatewayRepository) {}

  async createGateway(
    data: Prisma.PaymentGatewayConfigCreateInput,
    adminId: number,
  ): Promise<PaymentGatewayConfig> {
    try {
      return await this.gatewayRepository.createGateway({
        ...data,
        created_by: adminId,
        updated_by: adminId,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError('DUPLICATE_GATEWAY', 'A gateway configuration conflict occurred.', 409);
      }
      throw error;
    }
  }

  async getAllGateways(): Promise<PaymentGatewayConfig[]> {
    return this.gatewayRepository.findAllGateways();
  }

  async getGatewayById(id: number): Promise<PaymentGatewayConfig> {
    const gateway = await this.gatewayRepository.findGatewayById(id);
    if (!gateway) {
      throw new AppError(
        'GATEWAY_NOT_FOUND',
        `Gateway configuration with ID ${id} not found.`,
        404,
      );
    }
    return gateway;
  }

  async updateGateway(
    id: number,
    data: Prisma.PaymentGatewayConfigUpdateInput,
    adminId: number,
  ): Promise<PaymentGatewayConfig> {
    await this.getGatewayById(id); // verify existence
    try {
      return await this.gatewayRepository.updateGateway(id, {
        ...data,
        updated_by: adminId,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError('DUPLICATE_GATEWAY', 'A gateway configuration conflict occurred.', 409);
      }
      throw error;
    }
  }

  async removeGateway(id: number, adminId: number): Promise<void> {
    await this.getGatewayById(id);
    await this.gatewayRepository.removeGateway(id, adminId);
  }
}
