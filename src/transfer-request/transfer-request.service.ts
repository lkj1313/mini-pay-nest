import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseException } from '../common/exception/base.exception';
import { TransferRequestErrorCode } from './exception/transfer-request-error-code';
import { TransferRequestStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { getAccountTypeLabel } from '../common/utils/account-type.util';

@Injectable()
export class TransferRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async acceptTransferRequest(userId: string, requestId: string) {
    const request = await this.prisma.transferRequest.findUnique({
      where: { id: requestId },
      include: { senderAccount: true, recipientAccount: true },
    });

    if (!request) {
      throw new BaseException(
        TransferRequestErrorCode.TRANSFER_REQUEST_NOT_FOUND,
      );
    }

    if (request.recipientAccount.userId !== userId) {
      throw new BaseException(TransferRequestErrorCode.NOT_RECIPIENT);
    }

    if (request.status !== TransferRequestStatus.PENDING) {
      throw new BaseException(TransferRequestErrorCode.ALREADY_PROCESSED);
    }

    if (request.expiresAt < new Date()) {
      await this.prisma.transferRequest.update({
        where: { id: requestId },
        data: { status: TransferRequestStatus.EXPIRED },
      });
      throw new BaseException(
        TransferRequestErrorCode.EXPIRED_TRANSFER_REQUEST,
      );
    }

    const groupId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      const updatedRecipient = await tx.account.update({
        where: { id: request.recipientAccountId },
        data: { balance: { increment: request.amount } },
      });

      const sender = await tx.account.findUnique({
        where: { id: request.senderAccountId },
      });

      await tx.transferRequest.update({
        where: { id: requestId },
        data: { status: TransferRequestStatus.ACCEPTED },
      });

      await tx.transaction.create({
        data: {
          accountId: request.senderAccountId,
          type: 'TRANSFER_OUT',
          amount: -request.amount,
          balanceAfter: sender!.balance,
          groupId,
          counterpartyId: request.recipientAccountId,
          counterpartyName: getAccountTypeLabel(request.recipientAccount.type),
        },
      });

      await tx.transaction.create({
        data: {
          accountId: request.recipientAccountId,
          type: 'TRANSFER_IN',
          amount: request.amount,
          balanceAfter: updatedRecipient.balance,
          groupId,
          counterpartyId: request.senderAccountId,
          counterpartyName: getAccountTypeLabel(request.senderAccount.type),
        },
      });
    });
  }

  async rejectTransferRequest(userId: string, requestId: string) {
    const request = await this.prisma.transferRequest.findUnique({
      where: { id: requestId },
      include: { senderAccount: true, recipientAccount: true },
    });

    if (!request) {
      throw new BaseException(
        TransferRequestErrorCode.TRANSFER_REQUEST_NOT_FOUND,
      );
    }

    if (request.recipientAccount.userId !== userId) {
      throw new BaseException(TransferRequestErrorCode.NOT_RECIPIENT);
    }

    if (request.status !== TransferRequestStatus.PENDING) {
      throw new BaseException(TransferRequestErrorCode.ALREADY_PROCESSED);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: request.senderAccountId },
        data: { balance: { increment: request.amount } },
      });

      await tx.transferRequest.update({
        where: { id: requestId },
        data: { status: TransferRequestStatus.REJECTED },
      });
    });
  }

  async cancelTransferRequest(userId: string, requestId: string) {
    const request = await this.prisma.transferRequest.findUnique({
      where: { id: requestId },
      include: { senderAccount: true },
    });

    if (!request) {
      throw new BaseException(
        TransferRequestErrorCode.TRANSFER_REQUEST_NOT_FOUND,
      );
    }

    if (request.senderAccount.userId !== userId) {
      throw new BaseException(TransferRequestErrorCode.NOT_SENDER);
    }

    if (request.status !== TransferRequestStatus.PENDING) {
      throw new BaseException(TransferRequestErrorCode.ALREADY_PROCESSED);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: request.senderAccountId },
        data: { balance: { increment: request.amount } },
      });

      await tx.transferRequest.update({
        where: { id: requestId },
        data: { status: TransferRequestStatus.CANCELLED },
      });
    });
  }

  async findReceivedRequests(userId: string, status?: TransferRequestStatus) {
    return this.prisma.transferRequest.findMany({
      where: {
        recipientAccount: { userId },
        ...(status && { status }),
      },
      include: { senderAccount: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSentRequests(userId: string, status?: TransferRequestStatus) {
    return this.prisma.transferRequest.findMany({
      where: {
        senderAccount: { userId },
        ...(status && { status }),
      },
      include: { recipientAccount: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
