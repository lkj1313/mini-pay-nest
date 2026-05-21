-- CreateIndex
CREATE UNIQUE INDEX "settlement_participants_settlementId_userId_key" ON "settlement_participants"("settlementId", "userId");
