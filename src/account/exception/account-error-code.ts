import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../common/exception/error-code.interface';

export const AccountErrorCode = {
  MAIN_ACCOUNT_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'ACCOUNT-001',
    message: '메인 계좌를 찾을 수 없습니다.',
  },
  SAVINGS_ACCOUNT_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'ACCOUNT-002',
    message: '적금 계좌를 찾을 수 없습니다.',
  },
  INSUFFICIENT_BALANCE: {
    status: HttpStatus.BAD_REQUEST,
    code: 'ACCOUNT-003',
    message: '잔액이 부족합니다.',
  },
  DAILY_TOP_UP_LIMIT_EXCEEDED: {
    status: HttpStatus.BAD_REQUEST,
    code: 'ACCOUNT-004',
    message: '일일 충전 한도를 초과했습니다.',
  },
  ACCOUNT_ACCESS_DENIED: {
    status: HttpStatus.FORBIDDEN,
    code: 'ACCOUNT-005',
    message: '해당 계좌에 접근할 수 없습니다.',
  },
  INVALID_AMOUNT: {
    status: HttpStatus.BAD_REQUEST,
    code: 'ACCOUNT-006',
    message: '금액은 0보다 커야 합니다.',
  },
  RECIPIENT_ACCOUNT_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'ACCOUNT-007',
    message: '수신 계좌를 찾을 수 없습니다.',
  },
  CANNOT_TRANSFER_TO_SELF: {
    status: HttpStatus.BAD_REQUEST,
    code: 'ACCOUNT-008',
    message: '본인 계좌로는 송금할 수 없습니다.',
  },
  RECIPIENT_NOT_MAIN_ACCOUNT: {
    status: HttpStatus.BAD_REQUEST,
    code: 'ACCOUNT-009',
    message: '수신 계좌는 메인 계좌여야 합니다.',
  },
} as const satisfies Record<string, ErrorCode>;
