-- CreateEnum
CREATE TYPE "SavingsProductType" AS ENUM ('FIXED', 'FLEXIBLE');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "interestRate" DECIMAL(5,4),
ADD COLUMN     "lastInterestAt" TIMESTAMP(3),
ADD COLUMN     "productType" "SavingsProductType",
ADD COLUMN     "targetAmount" BIGINT DEFAULT 0;
