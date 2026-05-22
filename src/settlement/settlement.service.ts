import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseException } from '../common/exception/base.exception';
import { SettlementErrorCode } from './exception/settlement-error-code';
import { AccountErrorCode } from '../account/exception/account-error-code';
import { getAccountTypeLabel } from '../common/utils/account-type.util';
import { randomUUID } from 'crypto';
import {
  SettlementType,
  ParticipantStatus,
  SettlementStatus,
} from '@prisma/client';

function getRandomBigInt(min: bigint, max: bigint): bigint {
  const range = max - min;
  if (range <= 0n) return min;
  const randomNum = BigInt(Math.floor(Number(range) * Math.random()));
  return min + randomNum;
}

@Injectable()
export class SettlementService {
  constructor(private readonly prisma: PrismaService) {}

  // 정산 생성
  async createSettlement(
    requesterId: string,
    totalAmount: bigint,
    type: SettlementType,
    participantUserIds: string[],
  ) {
    if (totalAmount <= 0n) {
      throw new BaseException(
        SettlementErrorCode.INSUFFICIENT_SETTLEMENT_AMOUNT,
      );
    }

    const n = participantUserIds.length;
    if (n === 0) {
      throw new BaseException(SettlementErrorCode.EMPTY_PARTICIPANTS);
    }

    if (type === 'RANDOM' && totalAmount < BigInt(n) * 100n) {
      throw new BaseException(
        SettlementErrorCode.INSUFFICIENT_SETTLEMENT_AMOUNT,
      );
    }

    const uniqueUserIds = [...new Set(participantUserIds)];
    const amounts = this.calculateAmounts(
      totalAmount,
      type,
      uniqueUserIds.length,
    );

    const settlement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.settlement.create({
        data: {
          requesterId,
          totalAmount,
          type,
          status: SettlementStatus.PENDING,
        },
      });

      const participantData = uniqueUserIds.map((userId, index) => ({
        settlementId: created.id,
        userId,
        amount: amounts[index],
        status:
          userId === requesterId
            ? ParticipantStatus.PAID
            : ParticipantStatus.PENDING,
      }));

      await tx.settlementParticipant.createMany({
        data: participantData,
      });

      return created;
    });

    return this.prisma.settlement.findUnique({
      where: { id: settlement.id },
      include: { participants: true },
    });
  }
  // 정산 금액 계산
  private calculateAmounts(
    totalAmount: bigint,
    type: SettlementType,
    n: number,
  ): bigint[] {
    const amounts: bigint[] = new Array(n).fill(0n);

    if (type === 'EQUAL') {
      const base = totalAmount / BigInt(n);
      const remainder = totalAmount % BigInt(n);

      for (let i = 0; i < n; i++) {
        amounts[i] = base;
      }

      if (remainder > 0n) {
        const indices = Array.from({ length: n }, (_, i) => i);
        this.shuffleArray(indices);
        for (let i = 0; i < Number(remainder); i++) {
          amounts[indices[i]] += 1n;
        }
      }
    } else if (type === 'RANDOM') {
      let remaining = totalAmount;

      for (let i = 0; i < n - 1; i++) {
        const remainingPeople = n - i;
        const maxForThis = remaining - BigInt(remainingPeople - 1) * 100n;
        const randomAmount = getRandomBigInt(100n, maxForThis);
        amounts[i] = randomAmount;
        remaining -= randomAmount;
      }

      amounts[n - 1] = remaining;
    }

    return amounts;
  }
  // 배열 섞기 (Fisher-Yates 알고리즘)
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  // 정산 송금 처리
  async paySettlement(userId: string, settlementId: string) {
    const participant = await this.prisma.settlementParticipant.findUnique({
      where: {
        settlementId_userId: {
          settlementId,
          userId,
        },
      },
      include: {
        settlement: true,
      },
    });

    if (!participant) {
      throw new BaseException(SettlementErrorCode.NOT_PARTICIPANT);
    }

    if (participant.status === ParticipantStatus.PAID) {
      throw new BaseException(SettlementErrorCode.ALREADY_PAID);
    }

    const amount = participant.amount;

    // 송금자(나) 메인 계좌 조회
    const senderAccount = await this.prisma.account.findFirst({
      where: { userId, type: 'MAIN' },
    });
    if (!senderAccount) {
      throw new BaseException(AccountErrorCode.MAIN_ACCOUNT_NOT_FOUND);
    }

    // 수신자(정산 요청자/방장) 메인 계좌 조회
    const recipientAccount = await this.prisma.account.findFirst({
      where: { userId: participant.settlement.requesterId, type: 'MAIN' },
    });
    if (!recipientAccount) {
      throw new BaseException(AccountErrorCode.RECIPIENT_ACCOUNT_NOT_FOUND);
    }

    const groupId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      // 송금자 계좌 잠금 + 잔액 재확인
      await tx.$queryRaw`
        SELECT * FROM accounts WHERE id = ${senderAccount.id} FOR UPDATE
      `;

      const freshSender = await tx.account.findUnique({
        where: { id: senderAccount.id },
      });
      if (!freshSender || freshSender.balance < amount) {
        throw new BaseException(AccountErrorCode.INSUFFICIENT_BALANCE);
      }

      // 송금자 잔액 차감
      const updatedSender = await tx.account.update({
        where: { id: senderAccount.id },
        data: { balance: { decrement: amount } },
      });

      // 수신자 잔액 증가
      const updatedRecipient = await tx.account.update({
        where: { id: recipientAccount.id },
        data: { balance: { increment: amount } },
      });

      // 거래 내역 기록 (2줄: 출금/입금)
      await tx.transaction.create({
        data: {
          accountId: senderAccount.id,
          type: 'TRANSFER_OUT',
          amount: -amount,
          balanceAfter: updatedSender.balance,
          groupId,
          counterpartyId: recipientAccount.id,
          counterpartyName: getAccountTypeLabel(recipientAccount.type),
        },
      });

      await tx.transaction.create({
        data: {
          accountId: recipientAccount.id,
          type: 'TRANSFER_IN',
          amount,
          balanceAfter: updatedRecipient.balance,
          groupId,
          counterpartyId: senderAccount.id,
          counterpartyName: getAccountTypeLabel(senderAccount.type),
        },
      });

      // 정산 참여자 상태 변경
      await tx.settlementParticipant.update({
        where: {
          settlementId_userId: {
            settlementId,
            userId,
          },
        },
        data: { status: ParticipantStatus.PAID },
      });

      const pendingCount = await tx.settlementParticipant.count({
        where: {
          settlementId,
          status: ParticipantStatus.PENDING,
        },
      });

      if (pendingCount === 0) {
        await tx.settlement.update({
          where: { id: settlementId },
          data: { status: SettlementStatus.COMPLETED },
        });
      }
    });
  }
  // 내가 참여한 정산 조회
  async findMySettlements(userId: string) {
    return this.prisma.settlement.findMany({
      where: {
        OR: [
          { requesterId: userId },
          {
            participants: {
              some: { userId },
            },
          },
        ],
      },
      include: { participants: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
