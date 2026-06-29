import { PrismaClient, Prisma, CoinCurrency } from '@prisma/client';

export type FormattedCoinCurrency = Omit<CoinCurrency, 'effective_from' | 'effective_until'> & {
  effective_from: Date;
  effective_until: Date | null;
};

const formatDates = (currency: CoinCurrency | null): any => {
  if (!currency) return currency;
  return {
    ...currency,
    effective_from:
      currency.effective_from instanceof Date
        ? currency.effective_from.toISOString().split('T')[0]
        : currency.effective_from,
    effective_until:
      currency.effective_until instanceof Date
        ? currency.effective_until.toISOString().split('T')[0]
        : currency.effective_until,
  };
};

const parseInputDates = (data: any): any => {
  const result = { ...data };
  if (typeof result.effective_from === 'string') {
    result.effective_from = new Date(result.effective_from);
  }
  if (typeof result.effective_until === 'string') {
    result.effective_until = new Date(result.effective_until);
  }
  return result;
};

export class CurrencyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.CoinCurrencyCreateInput): Promise<FormattedCoinCurrency> {
    const result = await this.prisma.$transaction(async (tx) => {
      // If the new currency is active (or by default true), deactivate any existing active ones
      if (data.is_active === true || typeof data.is_active === 'undefined') {
        const updaterId = typeof data.created_by === 'number' ? data.created_by : null;
        await tx.coinCurrency.updateMany({
          where: { deleted_at: null, is_active: true },
          data: { is_active: false, updated_by: updaterId },
        });
        data.is_active = true;
      }
      return tx.coinCurrency.create({ data: parseInputDates(data) });
    });
    return formatDates(result);
  }

  async findAll(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: FormattedCoinCurrency[];
    total: number;
  }> {
    const skip = (page - 1) * limit;

    const where: Prisma.CoinCurrencyWhereInput = search
      ? {
          OR: [
            { currency_name: { contains: search, mode: 'insensitive' } },
            { currency_code: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.coinCurrency.findMany({
        where: { ...where, deleted_at: null },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.coinCurrency.count({ where: { ...where, deleted_at: null } }),
    ]);

    return {
      data: data.map(formatDates),
      total,
    };
  }

  async findActive(): Promise<FormattedCoinCurrency | null> {
    const result = await this.prisma.coinCurrency.findFirst({
      where: { deleted_at: null, is_active: true },
    });
    return formatDates(result);
  }

  async findById(id: number): Promise<FormattedCoinCurrency | null> {
    const result = await this.prisma.coinCurrency.findUnique({
      where: { id, deleted_at: null },
    });
    return formatDates(result);
  }

  async update(id: number, data: Prisma.CoinCurrencyUpdateInput): Promise<FormattedCoinCurrency> {
    const result = await this.prisma.$transaction(async (tx) => {
      // If we are updating this to be active, deactivate all others atomically
      if (data.is_active === true) {
        const updaterId = typeof data.updated_by === 'number' ? data.updated_by : null;
        await tx.coinCurrency.updateMany({
          where: { deleted_at: null, is_active: true, id: { not: id } },
          data: { is_active: false, updated_by: updaterId },
        });
      }
      return tx.coinCurrency.update({
        where: { id },
        data: parseInputDates(data),
      });
    });
    return formatDates(result);
  }

  async deactivateAll(adminId: number): Promise<void> {
    await this.prisma.coinCurrency.updateMany({
      where: { deleted_at: null, is_active: true },
      data: { is_active: false, updated_by: adminId },
    });
  }

  async activate(id: number, adminId: number): Promise<FormattedCoinCurrency> {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.coinCurrency.updateMany({
        where: { deleted_at: null, is_active: true },
        data: { is_active: false, updated_by: adminId },
      });
      return tx.coinCurrency.update({
        where: { id },
        data: { is_active: true, updated_by: adminId },
      });
    });
    return formatDates(result);
  }

  async removeSoft(id: number, adminId: number): Promise<FormattedCoinCurrency> {
    const result = await this.prisma.coinCurrency.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
        deleted_by: adminId,
      },
    });
    return formatDates(result);
  }
}
