import { PaymentGatewayConfig } from '@prisma/client';

export class PaymentGatewayMapper {
  static toResponse(gateway: PaymentGatewayConfig) {
    return {
      id: gateway.id,
      gateway_name: gateway.gateway_name,
      provider: gateway.provider,
      api_key_ref: gateway.api_key_ref,
      webhook_url: gateway.webhook_url,
      is_active: gateway.is_active,
      created_at: gateway.created_at,
      updated_at: gateway.updated_at,
    };
  }
}
