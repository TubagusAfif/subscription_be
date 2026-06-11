-- CreateEnum
CREATE TYPE "WebhookOutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "webhook_outbox" (
    "id" BIGSERIAL NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3),
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_outbox_idempotency_key_key" ON "webhook_outbox"("idempotency_key");
