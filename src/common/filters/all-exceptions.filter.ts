import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from '../exception/base.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let errorCode: string;
    let message: string;

    if (exception instanceof BaseException) {
      statusCode = exception.errorCode.status;
      errorCode = exception.errorCode.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorCode = `HTTP-${statusCode}`;

      const responseBody = exception.getResponse();
      message =
        typeof responseBody === 'string'
          ? responseBody
          : (responseBody as any).message || 'Bad Request';
    } else {
      console.error('Unexpected error:', exception);
      statusCode = 500;
      errorCode = 'INTERNAL-001';
      message = 'Internal server error';
    }

    response.status(statusCode).json({
      statusCode,
      code: errorCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
