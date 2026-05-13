import { CoinOrder } from '@prisma/client';

export class CoinOrderMapper {
  static toResponse(order: CoinOrder) {
    return {
      id: order.id,
      user_id: order.user_id,
      bundle_id: order.bundle_id,
      is_custom_qty: order.is_custom_qty,
      coin_amount: order.coin_amount,
      currency_id: order.currency_id,
      price_paid: Number(order.price_paid),
      tax_amount: Number(order.tax_amount),
      status: order.status,
      checkout_url: order.redirect_url,
      pg_order_id: order.pg_order_id,
      pg_response_id: order.pg_response_id,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }
}
