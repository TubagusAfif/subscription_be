import { PrismaClient, Prisma, PaymentMethod } from '@prisma/client';
import { env } from '../config/env';

export class PaymentMethodRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Builds the "supported on the active gateway" filter: the gateway-specific
   * code for env.PAYMENT_GATEWAY must be set (non-null). A method with no code
   * for the active gateway cannot be charged there, so it is hidden.
   */
  private activeGatewayWhere(): Prisma.PaymentMethodWhereInput {
    return env.PAYMENT_GATEWAY === 'megabank'
      ? { bank_mega_code: { not: null } }
      : { midtrans_code: { not: null } };
  }

  async create(data: Prisma.PaymentMethodCreateInput): Promise<PaymentMethod> {
    return this.prisma.paymentMethod.create({
      data,
    });
  }

  async findAll(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: PaymentMethod[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentMethodWhereInput = {
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { bank_mega_code: { contains: search, mode: 'insensitive' } },
              { midtrans_code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.paymentMethod.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentMethod.count({ where }),
    ]);

    return { data, total };
  }

  async findActive(): Promise<PaymentMethod[]> {
    return this.prisma.paymentMethod.findMany({
      where: {
        is_active: true,
        deleted_at: null,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number): Promise<PaymentMethod | null> {
    return this.prisma.paymentMethod.findUnique({
      where: { id, deleted_at: null },
    });
  }

  /** Look up a method by its code for the currently active gateway. */
  async findByCode(code: string): Promise<PaymentMethod | null> {
    return this.prisma.paymentMethod.findFirst({
      where: {
        deleted_at: null,
        ...(env.PAYMENT_GATEWAY === 'megabank' ? { bank_mega_code: code } : { midtrans_code: code }),
      },
    });
  }

  async update(id: number, data: Prisma.PaymentMethodUpdateInput): Promise<PaymentMethod> {
    return this.prisma.paymentMethod.update({
      where: { id },
      data,
    });
  }

  async removeSoft(id: number, adminId: number): Promise<PaymentMethod> {
    return this.prisma.paymentMethod.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
        deleted_by: adminId,
      },
    });
  }
}
