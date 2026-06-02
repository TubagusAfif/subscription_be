import { PrismaClient } from '@prisma/client';

export class PlanSwitchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getPlanSwitchStats() {
    const [total, upgrades, downgrades, crossgrades] = await Promise.all([
      this.prisma.planSwitch.count({
        where: { deleted_at: null },
      }),
      this.prisma.planSwitch.count({
        where: { deleted_at: null, switch_type: 'UPGRADE' },
      }),
      this.prisma.planSwitch.count({
        where: { deleted_at: null, switch_type: 'DOWNGRADE' },
      }),
      this.prisma.planSwitch.count({
        where: { deleted_at: null, switch_type: 'CROSSGRADE' },
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
