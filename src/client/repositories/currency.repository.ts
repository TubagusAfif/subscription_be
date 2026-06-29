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

export class CurrencyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActive(): Promise<FormattedCoinCurrency | null> {
    const result = await this.prisma.coinCurrency.findFirst({
      where: { deleted_at: null, is_active: true },
    });
    return formatDates(result);
  }
}
