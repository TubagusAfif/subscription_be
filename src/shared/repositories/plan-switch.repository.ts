import { PrismaClient } from '@prisma/client';

export class PlanSwitchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getPlanSwitchStats(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? { created_at: { gte: startDate, lt: endDate } } : {};

    const [total, upgrades, downgrades, crossgrades] = await Promise.all([
      this.prisma.planSwitch.count({
        where: { deleted_at: null, ...dateFilter },
      }),
      this.prisma.planSwitch.count({
        where: { deleted_at: null, switch_type: 'UPGRADE', ...dateFilter },
      }),
      this.prisma.planSwitch.count({
        where: { deleted_at: null, switch_type: 'DOWNGRADE', ...dateFilter },
      }),
      this.prisma.planSwitch.count({
        where: { deleted_at: null, switch_type: 'CROSSGRADE', ...dateFilter },
      }),
    ]);

    return {
      total_switches: total,
      upgrades,
      downgrades,
      crossgrades,
    };
  }
}
