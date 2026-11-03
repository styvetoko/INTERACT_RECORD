import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestsError extends HttpException {
  constructor(code: string, message: string) {
    super({ code, message }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
