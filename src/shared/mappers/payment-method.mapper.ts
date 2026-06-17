import { PaymentMethod } from '@prisma/client';
import { getImageUrl } from '../utils/url.util';

export class PaymentMethodMapper {
  static toResponse(pm: PaymentMethod) {
    return {
      id: pm.id,
      name: pm.name,
      code: pm.code,
      fee_type: pm.fee_type,
      fee_value: pm.fee_value,
      is_active: pm.is_active,
      image_url: getImageUrl(pm.image_path),
    };
  }
}
