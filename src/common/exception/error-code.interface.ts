import { HttpStatus } from '@nestjs/common';

export interface ErrorCode {
  status: HttpStatus;
  code: string;
  message: string;
}
