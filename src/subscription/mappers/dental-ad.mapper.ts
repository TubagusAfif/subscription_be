import { DentalAd } from '@prisma/client';
import { getImageUrl } from '../../shared/utils/url.util';

export class DentalAdMapper {
  static toResponse(ad: DentalAd) {
    if (!ad) return null;
    return {
      id: ad.id,
      name: ad.name,
      category: ad.category,
      image_url: getImageUrl(ad.image_path),
      created_at: ad.created_at,
      updated_at: ad.updated_at,
    };
  }
}
