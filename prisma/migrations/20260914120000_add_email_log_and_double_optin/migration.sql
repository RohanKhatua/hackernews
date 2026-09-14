-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "confirmationToken" TEXT;

-- Grandfather existing subscribers as confirmed
UPDATE "Subscriber" SET "confirmedAt" = "createdAt" WHERE "confirmedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_confirmationToken_key" ON "Subscriber"("confirmationToken");

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "batchKey" TEXT,
    "providerId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_batchKey_recipient_key" ON "EmailLog"("batchKey", "recipient");

-- CreateIndex
CREATE INDEX "EmailLog_recipient_idx" ON "EmailLog"("recipient");

-- CreateIndex
CREATE INDEX "EmailLog_kind_createdAt_idx" ON "EmailLog"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_providerId_idx" ON "EmailLog"("providerId");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
