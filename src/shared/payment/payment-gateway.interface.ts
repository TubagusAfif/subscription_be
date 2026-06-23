/**
 * Gateway-agnostic payment abstraction.
 *
 * Lets the coin-order flow create a checkout without knowing which provider
 * (Midtrans Snap or Bank Mega IPG) is active. The active gateway is selected
 * by `PAYMENT_GATEWAY` in the DI container (see services.container.ts).
 */

export interface PaymentGatewayCustomer {
  name: string;
  email: string;
  phoneNumber: string;
}

export interface CreateCheckoutParams {
  /** Our internal order reference (CoinOrder.pg_order_id). */
  pgOrderId: string;
  /** Total amount to charge, integer minor-unit-free IDR (e.g. 15000). */
  amount: number;
  /** ISO currency code, currently always 'IDR'. */
  currency: string;
  /** URL the gateway can call back / reference for this order. */
  referenceUrl: string;
  customer: PaymentGatewayCustomer;
  /** PaymentMethod.code — optional hint for gateways that support it. */
  paymentSource?: string;
  /** Human-readable line-item name shown on the gateway checkout. */
  itemName?: string;
}

export interface CheckoutResult {
  /** Gateway-side id: Mega inquiry id or Midtrans Snap token. -> CoinOrder.pg_response_id */
  pgResponseId: string;
  /** Hosted checkout URL the client redirects to. -> CoinOrder.redirect_url + response checkout_url */
  checkoutUrl: string;
  /** Midtrans Snap token (omitted for Mega). -> CoinOrder.snap_token */
  snapToken?: string;
}

export type PaymentGatewayName = 'MIDTRANS' | 'MEGABANK';

export interface PaymentGateway {
  readonly name: PaymentGatewayName;
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult>;
}
