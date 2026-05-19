import { ErrorCode } from './error-code.interface';

export class BaseException extends Error {
  constructor(
    public readonly errorCode: ErrorCode,
    message?: string,
  ) {
    super(message ?? errorCode.message);
  }
}
