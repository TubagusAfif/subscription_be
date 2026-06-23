import { PaymentMethod } from '@prisma/client';
import { getImageUrl } from '../utils/url.util';
import { env } from '../config/env';

export class PaymentMethodMapper {
  static toResponse(pm: PaymentMethod) {
    return {
      id: pm.id,
      name: pm.name,
      code: env.PAYMENT_GATEWAY === 'megabank' ? pm.bank_mega_code : pm.midtrans_code,
      fee_type: pm.fee_type,
      fee_value: pm.fee_value,
      is_active: pm.is_active,
      image_url: getImageUrl(pm.image_path),
    };
  }

  static toListResponse(pms: PaymentMethod[]) {
    return {
      payment_gateway: env.PAYMENT_GATEWAY,
      data: pms.map((pm) => this.toResponse(pm)),
    };
  }
}
