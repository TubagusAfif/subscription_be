import { PrismaClient, Prisma, PaymentGatewayConfig } from '@prisma/client';

/** 
---------------------------------------------------------------
  Repository for managing Payment Gateway Configurations.
---------------------------------------------------------------
**/
export class PaymentGatewayRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createGateway(data: Prisma.PaymentGatewayConfigCreateInput): Promise<PaymentGatewayConfig> {
    return this.prisma.paymentGatewayConfig.create({ data });
  }

  async findAllGateways(): Promise<PaymentGatewayConfig[]> {
    return this.prisma.paymentGatewayConfig.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async findGatewayById(id: number): Promise<PaymentGatewayConfig | null> {
    return this.prisma.paymentGatewayConfig.findUnique({
      where: { id, deleted_at: null },
    });
  }

  async updateGateway(
    id: number,
    data: Prisma.PaymentGatewayConfigUpdateInput,
  ): Promise<PaymentGatewayConfig> {
    return this.prisma.paymentGatewayConfig.update({
      where: { id },
      data,
    });
  }

  // Soft delete
  async removeGateway(id: number, adminId: number): Promise<PaymentGatewayConfig> {
    return this.prisma.paymentGatewayConfig.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
        deleted_by: adminId,
      },
    });
  }
}
