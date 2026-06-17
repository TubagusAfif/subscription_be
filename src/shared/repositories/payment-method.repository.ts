import { PrismaClient, Prisma, PaymentMethod } from '@prisma/client';

export class PaymentMethodRepository {
  constructor(private readonly prisma: PrismaClient) {}

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
              { code: { contains: search, mode: 'insensitive' } },
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

  async findByCode(code: string): Promise<PaymentMethod | null> {
    return this.prisma.paymentMethod.findUnique({
      where: { code, deleted_at: null },
    });
  }

  async update(
    id: number,
    data: Prisma.PaymentMethodUpdateInput,
  ): Promise<PaymentMethod> {
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
