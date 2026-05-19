import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseException } from '../common/exception/base.exception';
import { AccountErrorCode } from './exception/account-error-code';
import { getKSTDate } from '../common/utils/date.util';

const DAILY_TOP_UP_LIMIT = 3_000_000;

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async findMyAccounts(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        balance: true,
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createSavingsAccount(userId: string) {
    const mainAccount = await this.prisma.account.findFirst({
      where: { userId, type: 'MAIN' },
    });
    if (!mainAccount) {
      throw new BaseException(AccountErrorCode.MAIN_ACCOUNT_NOT_FOUND);
    }

    return this.prisma.account.create({
      data: {
        userId,
        type: 'SAVINGS',
      },
    });
  }

  async chargeMainAccount(userId: string, amount: bigint) {
    if (amount <= 0n) {
      throw new BaseException(AccountErrorCode.INSUFFICIENT_BALANCE);
    }

    const mainAccount = await this.prisma.account.findFirst({
      where: { userId, type: 'MAIN' },
    });
    if (!mainAccount) {
      throw new BaseException(AccountErrorCode.MAIN_ACCOUNT_NOT_FOUND);
    }

    const todayDate = getKSTDate();

    const result = await this.prisma.$transaction(async (tx) => {
      const usage = await tx.dailyTopUpUsage.upsert({
        where: {
          userId_usageDate: { userId, usageDate: todayDate },
        },
        update: {
          usedAmount: { increment: amount },
        },
        create: {
          userId,
          usageDate: todayDate,
          usedAmount: amount,
        },
      });

      if (usage.usedAmount > DAILY_TOP_UP_LIMIT) {
        throw new BaseException(AccountErrorCode.DAILY_TOP_UP_LIMIT_EXCEEDED);
      }

      const updatedAccount = await tx.account.update({
        where: { id: mainAccount.id },
        data: { balance: { increment: amount } },
      });

      return { account: updatedAccount, usage };
    });

    return result.account;
  }

  async depositToSavings(
    userId: string,
    savingsAccountId: string,
    amount: bigint,
  ) {
    if (amount <= 0n) {
      throw new BaseException(AccountErrorCode.INVALID_AMOUNT);
    }

    const mainAccount = await this.prisma.account.findFirst({
      where: { userId, type: 'MAIN' },
    });
    if (!mainAccount) {
      throw new BaseException(AccountErrorCode.MAIN_ACCOUNT_NOT_FOUND);
    }

    const savingsAccount = await this.prisma.account.findUnique({
      where: { id: savingsAccountId },
    });
    if (!savingsAccount || savingsAccount.type !== 'SAVINGS') {
      throw new BaseException(AccountErrorCode.SAVINGS_ACCOUNT_NOT_FOUND);
    }
    if (savingsAccount.userId !== userId) {
      throw new BaseException(AccountErrorCode.ACCOUNT_ACCESS_DENIED);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const ids = [mainAccount.id, savingsAccount.id].sort();
      await tx.$queryRaw`
        SELECT * FROM accounts 
        WHERE id IN (${ids[0]}, ${ids[1]}) 
        FOR UPDATE
      `;

      const main = await tx.account.findUnique({
        where: { id: mainAccount.id },
      });
      if (!main || main.balance < amount) {
        throw new BaseException(AccountErrorCode.INSUFFICIENT_BALANCE);
      }

      await tx.account.update({
        where: { id: mainAccount.id },
        data: { balance: { decrement: amount } },
      });

      const updatedSavings = await tx.account.update({
        where: { id: savingsAccountId },
        data: { balance: { increment: amount } },
      });

      return updatedSavings;
    });

    return result;
  }
}
