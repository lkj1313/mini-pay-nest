import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../common/exception/error-code.interface';

export const UserErrorCode = {
  EMAIL_ALREADY_EXISTS: {
    status: HttpStatus.CONFLICT,
    code: 'USER-001',
    message: '이미 사용 중인 이메일입니다.',
  },
  USER_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'USER-002',
    message: '사용자를 찾을 수 없습니다.',
  },
} as const satisfies Record<string, ErrorCode>;
