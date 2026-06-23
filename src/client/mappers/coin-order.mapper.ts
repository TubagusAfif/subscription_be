import { CoinOrder, PaymentMethod } from '@prisma/client';

export type CoinOrderWithPaymentMethod = CoinOrder & {
  payment_method?: PaymentMethod | null;
};

export class CoinOrderMapper {
  static toResponse(order: CoinOrderWithPaymentMethod) {
    return {
      id: order.id,
      user_id: order.user_id,
      bundle_id: order.bundle_id,
      is_custom_qty: order.is_custom_qty,
      coin_amount: order.coin_amount,
      currency_id: order.currency_id,
      coin_price: Number(order.coin_price),
      tax_amount: Number(order.tax_amount),
      gateway_fee: Number(order.gateway_fee),
      price_paid: Number(order.price_paid),
      payment_method_id: order.payment_method_id,
      payment_method: order.payment_method ? {
        id: order.payment_method.id,
        name: order.payment_method.name,
        bank_mega_code: order.payment_method.bank_mega_code,
        midtrans_code: order.payment_method.midtrans_code,
      } : null,
      status: order.status,
      payment_gateway: order.payment_gateway,
      checkout_url: order.redirect_url,
      snap_token: order.snap_token,
      pg_order_id: order.pg_order_id,
      pg_response_id: order.pg_response_id,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }
}
