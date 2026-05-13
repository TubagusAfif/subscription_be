import { BenefitRepository } from '../repositories/benefit.repository';
import { Prisma, SkuBenefit } from '@prisma/client';

export class BenefitService {
  constructor(private readonly benefitRepository: BenefitRepository) {}

  async upsertBenefits(
    skuId: number,
    benefits: Array<any>,
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<SkuBenefit[]> {
    return this.benefitRepository.upsertBenefits(skuId, benefits, adminId, tx);
  }

  async removeBenefits(
    skuId: number,
    benefitIds: number[],
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    return this.benefitRepository.removeBenefits(skuId, benefitIds, adminId, tx);
  }
}
