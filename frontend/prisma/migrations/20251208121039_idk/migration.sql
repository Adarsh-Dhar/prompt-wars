/*
  Warnings:

  - You are about to alter the column `moonPrice` on the `Market` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,4)`.
  - You are about to alter the column `rugPrice` on the `Market` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,4)`.
  - You are about to alter the column `totalVolume` on the `Market` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `liquidity` on the `Market` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.

*/
-- CreateEnum
CREATE TYPE "MarketState" AS ENUM ('ACTIVE', 'FROZEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MarketOutcome" AS ENUM ('YES', 'NO', 'INVALID');

-- AlterTable
ALTER TABLE "Market" ADD COLUMN     "closesAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "feeBps" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "lpMint" TEXT,
ADD COLUMN     "maxBet" DECIMAL(10,4),
ADD COLUMN     "minBet" DECIMAL(10,4) NOT NULL DEFAULT 1,
ADD COLUMN     "noMint" TEXT,
ADD COLUMN     "outcome" "MarketOutcome",
ADD COLUMN     "poolAuthority" TEXT,
ADD COLUMN     "poolNoAccount" TEXT,
ADD COLUMN     "poolYesAccount" TEXT,
ADD COLUMN     "reserveNo" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "reserveYes" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "resolutionTx" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedBy" TEXT,
ADD COLUMN     "state" "MarketState" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "statement" TEXT NOT NULL DEFAULT 'TBD',
ADD COLUMN     "yesMint" TEXT,
ALTER COLUMN "moonPrice" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "rugPrice" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "totalVolume" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "liquidity" SET DATA TYPE DECIMAL(18,4);

-- CreateIndex
CREATE INDEX "Market_state_idx" ON "Market"("state");

-- CreateIndex
CREATE INDEX "Market_outcome_idx" ON "Market"("outcome");
