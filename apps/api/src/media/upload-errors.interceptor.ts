import {
  BadRequestException, CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor,
  PayloadTooLargeException, ServiceUnavailableException, UnprocessableEntityException,
} from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';
import { ImageRejectedError } from './image-processing';

/** Traduit les erreurs d'envoi de fichier en erreurs de l'API avec un code stable. */
@Injectable()
export class UploadErrorsInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((err) => {
        if (err instanceof PayloadTooLargeException) {
          return throwError(() => new PayloadTooLargeException({ code: 'FILE_TOO_LARGE', message: 'Fichier trop lourd (15 Mo maximum)' }));
        }
        if (err instanceof ImageRejectedError) {
          const Exception = err.code === 'MEDIA_BUSY' ? ServiceUnavailableException : UnprocessableEntityException;
          return throwError(() => new Exception({ code: err.code, message: err.message }));
        }
        // Erreurs de multer : champ inattendu, trop de parties ou de champs
        if (err instanceof HttpException && err.getStatus() === HttpStatus.BAD_REQUEST && !hasCode(err)) {
          return throwError(() => new BadRequestException({ code: 'FILE_FIELD_INVALID', message: 'Envoie un seul fichier, dans le champ « file »' }));
        }
        return throwError(() => err);
      }),
    );
  }
}

function hasCode(err: HttpException): boolean {
  const body = err.getResponse();
  return typeof body === 'object' && body !== null && 'code' in body;
}
