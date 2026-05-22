import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../common/exception/error-code.interface';

export const SettlementErrorCode = {
  INSUFFICIENT_SETTLEMENT_AMOUNT: {
    status: HttpStatus.BAD_REQUEST,
    code: 'SETTLEMENT-001',
    message: '정산 금액이 참여자 수에 비해 부족합니다.',
  },
  EMPTY_PARTICIPANTS: {
    status: HttpStatus.BAD_REQUEST,
    code: 'SETTLEMENT-002',
    message: '최소 1명 이상의 참여자가 필요합니다.',
  },
  SETTLEMENT_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'SETTLEMENT-003',
    message: '정산을 찾을 수 없습니다.',
  },
  ALREADY_PAID: {
    status: HttpStatus.BAD_REQUEST,
    code: 'SETTLEMENT-004',
    message: '이미 송금이 완료된 참여자입니다.',
  },
  NOT_PARTICIPANT: {
    status: HttpStatus.FORBIDDEN,
    code: 'SETTLEMENT-005',
    message: '해당 정산의 참여자가 아닙니다.',
  },
} as const satisfies Record<string, ErrorCode>;
