import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TransferRequestStatus } from '@prisma/client';

@Injectable()
export class TransferRequestScheduler {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleTransferRequests() {
    await this.expireOldRequests();
    await this.sendReminders();
  }

  private async expireOldRequests() {
    const expired = await this.prisma.transferRequest.findMany({
      where: {
        status: TransferRequestStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
    });

    for (const req of expired) {
      await this.prisma.$transaction(async (tx) => {
        await tx.account.update({
          where: { id: req.senderAccountId },
          data: { balance: { increment: req.amount } },
        });
        await tx.transferRequest.update({
          where: { id: req.id },
          data: { status: TransferRequestStatus.EXPIRED },
        });
      });
    }
  }

  private async sendReminders() {
    const remindThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const soonExpired = await this.prisma.transferRequest.findMany({
      where: {
        status: TransferRequestStatus.PENDING,
        expiresAt: { lt: remindThreshold },
        remindedAt: null,
      },
    });

    for (const req of soonExpired) {
      console.log(
        `[REMIND] ${req.recipientAccountId}님, 송금 요청 ${req.id}가 24시간 내 만료됩니다.`,
      );

      await this.prisma.transferRequest.update({
        where: { id: req.id },
        data: { remindedAt: new Date() },
      });
    }
  }
}
