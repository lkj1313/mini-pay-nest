-- CreateEnum
CREATE TYPE "SettlementType" AS ENUM ('EQUAL', 'RANDOM');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'PAID');

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "type" "SettlementType" NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_participants" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlement_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settlement_participants_settlementId_idx" ON "settlement_participants"("settlementId");

-- CreateIndex
CREATE INDEX "settlement_participants_userId_idx" ON "settlement_participants"("userId");

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_participants" ADD CONSTRAINT "settlement_participants_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_participants" ADD CONSTRAINT "settlement_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
