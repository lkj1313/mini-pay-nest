-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CHARGE', 'TRANSFER_OUT', 'TRANSFER_IN', 'WITHDRAW');

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "balanceAfter" BIGINT NOT NULL,
    "groupId" TEXT,
    "counterpartyId" TEXT,
    "counterpartyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_accountId_createdAt_idx" ON "transactions"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_groupId_idx" ON "transactions"("groupId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
