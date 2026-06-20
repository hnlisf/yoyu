import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global exception filter — ensures all error responses have a body.
 * MBE.2 fix: 404 responses no longer return empty body.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      // If existing response is a string, wrap it; otherwise pass through
      const body =
        typeof res === 'string'
          ? { error: this.statusToError(status), message: res }
          : res;

      return response.status(status).json(body);
    }

    // Unknown exception → 500
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误',
    });
  }

  private statusToError(status: number): string {
    switch (status) {
      case 404:
        return 'NOT_FOUND';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 409:
        return 'CONFLICT';
      case 400:
        return 'BAD_REQUEST';
      default:
        return 'ERROR';
    }
  }
}
