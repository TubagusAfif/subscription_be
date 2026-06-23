-- Records which payment gateway actually created each order, so the order
-- remembers its gateway even if PAYMENT_GATEWAY is flipped during an incident.
ALTER TABLE "coin_orders" ADD COLUMN "payment_gateway" TEXT;
