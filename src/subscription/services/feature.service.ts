import { FeatureRepository } from '../repositories/feature.repository';
import { Prisma, SkuFeature } from '@prisma/client';

export class FeatureService {
  constructor(private readonly featureRepository: FeatureRepository) {}

  async upsertFeatures(
    skuId: number,
    features: Array<any>,
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<SkuFeature[]> {
    return this.featureRepository.upsertFeatures(skuId, features, adminId, tx);
  }

  async removeFeatures(
    skuId: number,
    featureIds: number[],
    adminId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    return this.featureRepository.removeFeatures(skuId, featureIds, adminId, tx);
  }
}
