import { CallHandler, ExecutionContext, Injectable, NestInterceptor, PayloadTooLargeException, UnprocessableEntityException } from '@nestjs/common';
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
          return throwError(() => new UnprocessableEntityException({ code: err.code, message: err.message }));
        }
        return throwError(() => err);
      }),
    );
  }
}
