/**
 * Midtrans Snap + HTTP notification types (only the fields we consume).
 * Reference: https://docs.midtrans.com/reference/https-notification
 */

export interface MidtransSnapParameter {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  customer_details?: {
    first_name?: string;
    email?: string;
    phone?: string;
  };
  item_details?: Array<{
    id?: string;
    price: number;
    quantity: number;
    name: string;
  }>;
  callbacks?: {
    finish?: string;
  };
  enabled_payments?: string[];
}

/**
 * Payment notification (HTTP webhook) sent by Midtrans to the merchant.
 * `order_id` corresponds to our CoinOrder.pg_order_id.
 */
export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string; // decimal string, e.g. "15000.00"
  signature_key: string;
  transaction_status: string; // settlement | capture | pending | deny | cancel | expire | failure
  fraud_status?: string; // accept | challenge | deny
  transaction_id?: string;
  payment_type?: string;
  status_message?: string;
}
