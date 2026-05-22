import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { getKSTDate } from '../common/utils/date.util';
import { randomUUID } from 'crypto';
import { getAccountTypeLabel } from '../common/utils/account-type.util';

@Injectable()
export class SavingsScheduler {
  constructor(private readonly prisma: PrismaService) {}

  // 매일 오전 4시: 이자 지급
  @Cron('0 4 * * *')
  async payInterest() {
    const today = getKSTDate();

    const savingsAccounts = await this.prisma.account.findMany({
      where: {
        type: 'SAVINGS',
        status: 'ACTIVE',
        interestRate: { not: null },
      },
    });

    for (const account of savingsAccounts) {
      // 이미 오늘 이자 받았으면 스킵
      if (
        account.lastInterestAt &&
        this.isSameDay(account.lastInterestAt, today)
      ) {
        continue;
      }

      // 일일 이자 = balance * rate / 365
      const dailyRate = Number(account.interestRate!) / 365;
      const interest = BigInt(Math.floor(Number(account.balance) * dailyRate));

      if (interest <= 0n) continue;

      const groupId = randomUUID();

      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.account.update({
          where: { id: account.id },
          data: {
            balance: { increment: interest },
            lastInterestAt: new Date(),
          },
        });

        await tx.transaction.create({
          data: {
            accountId: account.id,
            type: 'TRANSFER_IN',
            amount: interest,
            balanceAfter: updated.balance,
            groupId,
            counterpartyName: '이자 지급',
          },
        });
      });
    }
  }

  // 매일 오전 8시: 정기 적금 자동 출금
  @Cron('0 8 * * *')
  async depositFixedSavings() {
    const fixedAccounts = await this.prisma.account.findMany({
      where: {
        type: 'SAVINGS',
        productType: 'FIXED',
        status: 'ACTIVE',
        targetAmount: { gt: 0 },
      },
      include: {
        user: {
          include: {
            accounts: {
              where: { type: 'MAIN' },
            },
          },
        },
      },
    });

    for (const savings of fixedAccounts) {
      const mainAccount = savings.user.accounts[0];
      if (!mainAccount) continue;

      const amount = savings.targetAmount!;

      // 메인 계좌 잔액 부족하면 스킵 (자동충전 안 함)
      if (mainAccount.balance < amount) continue;

      const groupId = randomUUID();

      await this.prisma.$transaction(async (tx) => {
        const updatedMain = await tx.account.update({
          where: { id: mainAccount.id },
          data: { balance: { decrement: amount } },
        });

        const updatedSavings = await tx.account.update({
          where: { id: savings.id },
          data: { balance: { increment: amount } },
        });

        await tx.transaction.create({
          data: {
            accountId: mainAccount.id,
            type: 'TRANSFER_OUT',
            amount: -amount,
            balanceAfter: updatedMain.balance,
            groupId,
            counterpartyId: savings.id,
            counterpartyName: getAccountTypeLabel(savings.type),
          },
        });

        await tx.transaction.create({
          data: {
            accountId: savings.id,
            type: 'TRANSFER_IN',
            amount,
            balanceAfter: updatedSavings.balance,
            groupId,
            counterpartyId: mainAccount.id,
            counterpartyName: getAccountTypeLabel(mainAccount.type),
          },
        });
      });
    }
  }

  private isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }
}
