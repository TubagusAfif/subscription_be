import { PaymentMethod } from '@prisma/client';
import { getImageUrl } from '../utils/url.util';
import { env } from '../config/env';

export class PaymentMethodMapper {
  static toResponse(pm: PaymentMethod, isOwner: boolean = false) {
    return {
      id: pm.id,
      name: pm.name,
      ...(isOwner && { code: env.PAYMENT_GATEWAY === 'megabank' ? pm.bank_mega_code : pm.midtrans_code }),
      midtrans_code: pm.midtrans_code,
      bank_mega_code: pm.bank_mega_code,
      fee_type: pm.fee_type,
      fee_value: pm.fee_value,
      is_active: pm.is_active,
      image_url: getImageUrl(pm.image_path),
    };
  }
}