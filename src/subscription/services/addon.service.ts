import { AppError } from '../../shared/middlewares/error.middleware';
import { AddonRepository } from '../repositories/addon.repository';
import { Prisma, SkuAddon } from '@prisma/client';

export class AddonService {
  constructor(private readonly addonRepository: AddonRepository) {}

  async upsertAddons(
    skuId: number,
    addons: Array<any>,
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<SkuAddon[]> {
    if (addons && addons.length > 0) {
      for (const addon of addons) {
        if (!['CLINIC_ADDON', 'USER_ADDON'].includes(addon.resource_type)) {
          throw new AppError(
            'INVALID_ADDON',
            `Addon resource_type ${addon.resource_type} is not supported.`,
            400,
          );
        }
      }
    }

    return this.addonRepository.upsertAddons(skuId, addons, adminId, tx);
  }

  async removeAddons(
    skuId: number,
    addonIds: number[],
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    return this.addonRepository.removeAddons(skuId, addonIds, adminId, tx);
  }
}
