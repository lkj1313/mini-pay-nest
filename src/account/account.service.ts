import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseException } from '../common/exception/base.exception';
import { AccountErrorCode } from './exception/account-error-code';
import { getKSTDate } from '../common/utils/date.util';
import { randomUUID } from 'crypto';
import { getAccountTypeLabel } from '../common/utils/account-type.util';
import { TransferMode } from './dto/transfer-to-user.dto';

const DAILY_TOP_UP_LIMIT = 3_000_000;
const TEN_THOUSAND = 10000n;

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
      throw new BaseException(AccountErrorCode.INVALID_AMOUNT);
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

      await tx.transaction.create({
        data: {
          accountId: mainAccount.id,
          type: 'CHARGE',
          amount,
          balanceAfter: updatedAccount.balance,
          counterpartyName: null,
        },
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

    const groupId = randomUUID();

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

      const updatedMain = await tx.account.update({
        where: { id: mainAccount.id },
        data: { balance: { decrement: amount } },
      });

      const updatedSavings = await tx.account.update({
        where: { id: savingsAccountId },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          accountId: mainAccount.id,
          type: 'TRANSFER_OUT',
          amount: -amount,
          balanceAfter: updatedMain.balance,
          groupId,
          counterpartyId: savingsAccountId,
          counterpartyName: getAccountTypeLabel(savingsAccount.type),
        },
      });

      await tx.transaction.create({
        data: {
          accountId: savingsAccountId,
          type: 'TRANSFER_IN',
          amount,
          balanceAfter: updatedSavings.balance,
          groupId,
          counterpartyId: mainAccount.id,
          counterpartyName: getAccountTypeLabel(mainAccount.type),
        },
      });

      return updatedSavings;
    });

    return result;
  }

  async transferToUser(
    userId: string,
    recipientAccountId: string,
    amount: bigint,
    mode: TransferMode = TransferMode.INSTANT,
  ) {
    if (amount <= 0n) {
      throw new BaseException(AccountErrorCode.INVALID_AMOUNT);
    }

    const senderAccount = await this.prisma.account.findFirst({
      where: { userId, type: 'MAIN' },
    });
    if (!senderAccount) {
      throw new BaseException(AccountErrorCode.MAIN_ACCOUNT_NOT_FOUND);
    }

    const recipientAccount = await this.prisma.account.findUnique({
      where: { id: recipientAccountId },
    });
    if (!recipientAccount) {
      throw new BaseException(AccountErrorCode.RECIPIENT_ACCOUNT_NOT_FOUND);
    }
    if (recipientAccount.type !== 'MAIN') {
      throw new BaseException(AccountErrorCode.RECIPIENT_NOT_MAIN_ACCOUNT);
    }
    if (recipientAccount.userId === userId) {
      throw new BaseException(AccountErrorCode.CANNOT_TRANSFER_TO_SELF);
    }

    // ─── REQUIRE_CONFIRM: 수락 필요 모드 ───
    if (mode === TransferMode.REQUIRE_CONFIRM) {
      if (senderAccount.balance < amount) {
        throw new BaseException(AccountErrorCode.INSUFFICIENT_BALANCE);
      }

      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await this.prisma.$transaction(async (tx) => {
        await tx.account.update({
          where: { id: senderAccount.id },
          data: { balance: { decrement: amount } },
        });

        await tx.transferRequest.create({
          data: {
            senderAccountId: senderAccount.id,
            recipientAccountId: recipientAccount.id,
            amount,
            status: 'PENDING',
            expiresAt,
          },
        });
      });

      return;
    }

    // ─── INSTANT: 즉시 송금 (기존 로직) ───
    let chargeAmount = 0n;
    if (senderAccount.balance < amount) {
      const shortage = amount - senderAccount.balance;
      chargeAmount = ((shortage + 9999n) / TEN_THOUSAND) * TEN_THOUSAND;
    }

    const todayDate = getKSTDate();
    const groupId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      if (chargeAmount > 0n) {
        const usage = await tx.dailyTopUpUsage.upsert({
          where: {
            userId_usageDate: { userId, usageDate: todayDate },
          },
          update: {
            usedAmount: { increment: chargeAmount },
          },
          create: {
            userId,
            usageDate: todayDate,
            usedAmount: chargeAmount,
          },
        });

        if (usage.usedAmount > DAILY_TOP_UP_LIMIT) {
          throw new BaseException(AccountErrorCode.DAILY_TOP_UP_LIMIT_EXCEEDED);
        }
      }

      await tx.$queryRaw`
        SELECT * FROM accounts WHERE id = ${senderAccount.id} FOR UPDATE
      `;

      if (chargeAmount > 0n) {
        const charged = await tx.account.update({
          where: { id: senderAccount.id },
          data: { balance: { increment: chargeAmount } },
        });

        await tx.transaction.create({
          data: {
            accountId: senderAccount.id,
            type: 'CHARGE',
            amount: chargeAmount,
            balanceAfter: charged.balance,
            counterpartyName: null,
          },
        });
      }

      const updatedSender = await tx.account.update({
        where: { id: senderAccount.id },
        data: { balance: { decrement: amount } },
      });

      if (updatedSender.balance < 0n) {
        throw new BaseException(AccountErrorCode.INSUFFICIENT_BALANCE);
      }

      const updatedRecipient = await tx.account.update({
        where: { id: recipientAccountId },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          accountId: senderAccount.id,
          type: 'TRANSFER_OUT',
          amount: -amount,
          balanceAfter: updatedSender.balance,
          groupId,
          counterpartyId: recipientAccountId,
          counterpartyName: getAccountTypeLabel(recipientAccount.type),
        },
      });

      await tx.transaction.create({
        data: {
          accountId: recipientAccountId,
          type: 'TRANSFER_IN',
          amount,
          balanceAfter: updatedRecipient.balance,
          groupId,
          counterpartyId: senderAccount.id,
          counterpartyName: getAccountTypeLabel(senderAccount.type),
        },
      });
    });
  }

  async findTransactionsByAccountId(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      throw new BaseException(AccountErrorCode.MAIN_ACCOUNT_NOT_FOUND);
    }
    if (account.userId !== userId) {
      throw new BaseException(AccountErrorCode.ACCOUNT_ACCESS_DENIED);
    }

    return this.prisma.transaction.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
