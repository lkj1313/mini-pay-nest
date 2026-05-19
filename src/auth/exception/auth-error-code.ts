import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../common/exception/error-code.interface';

export const AuthErrorCode = {
  INVALID_CREDENTIALS: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'AUTH-001',
    message: '이메일 또는 비밀번호가 일치하지 않습니다.',
  },
  TOKEN_EXPIRED: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'AUTH-002',
    message: '액세스 토큰이 만료되었습니다.',
  },
  INVALID_TOKEN: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'AUTH-003',
    message: '유효하지 않은 토큰입니다.',
  },
  INVALID_REFRESH_TOKEN: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'AUTH-004',
    message: '유효하지 않은 리프레시 토큰입니다.',
  },
  USER_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: 'AUTH-005',
    message: '사용자를 찾을 수 없습니다.',
  },
} as const satisfies Record<string, ErrorCode>;
