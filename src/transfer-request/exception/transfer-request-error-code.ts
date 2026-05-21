import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../common/exception/error-code.interface';

export const TransferRequestErrorCode = {
  TRANSFER_REQUEST_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'TRANSFER-001',
    message: '송금 요청을 찾을 수 없습니다.',
  },
  ALREADY_PROCESSED: {
    status: HttpStatus.BAD_REQUEST,
    code: 'TRANSFER-002',
    message: '이미 처리된 송금 요청입니다.',
  },
  NOT_RECIPIENT: {
    status: HttpStatus.FORBIDDEN,
    code: 'TRANSFER-003',
    message: '해당 송금 요청의 수신자가 아닙니다.',
  },
  NOT_SENDER: {
    status: HttpStatus.FORBIDDEN,
    code: 'TRANSFER-004',
    message: '해당 송금 요청의 송신자가 아닙니다.',
  },
  EXPIRED_TRANSFER_REQUEST: {
    status: HttpStatus.BAD_REQUEST,
    code: 'TRANSFER-005',
    message: '만료된 송금 요청입니다.',
  },
} as const satisfies Record<string, ErrorCode>;
