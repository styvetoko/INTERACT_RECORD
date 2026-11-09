import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

/** Codes par défaut quand une erreur ne porte pas son propre code. */
const DEFAULT_CODES: Record<number, [string, string]> = {
  400: ['BAD_REQUEST', 'Requête invalide'],
  401: ['AUTH_REQUIRED', 'Connexion requise'],
  403: ['AUTH_FORBIDDEN', 'Accès refusé'],
  404: ['NOT_FOUND', 'Ressource introuvable'],
  405: ['METHOD_NOT_ALLOWED', 'Méthode non autorisée'],
  409: ['CONFLICT', 'Conflit'],
  413: ['PAYLOAD_TOO_LARGE', 'Contenu trop volumineux'],
  415: ['UNSUPPORTED_MEDIA_TYPE', 'Type de contenu non pris en charge'],
  422: ['UNPROCESSABLE', 'Données non traitables'],
  429: ['RATE_LIMITED', 'Trop de demandes. Réessaie dans quelques minutes.'],
  503: ['SERVICE_UNAVAILABLE', 'Service momentanément indisponible'],
};

/**
 * Toute erreur sort au même format { code, message } (skill conventions-api).
 * Une erreur inattendue est journalisée avec un identifiant ; l'utilisateur ne voit jamais de détail technique.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    if (res.headersSent) return;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'code' in body) {
        res.status(status).json(body);
        return;
      }
      const [code, message] = DEFAULT_CODES[status] ?? ['ERROR', 'Erreur'];
      res.status(status).json({ code, message });
      return;
    }

    const requestId = randomUUID();
    this.logger.error(
      `${requestId} ${req.method} ${req.path} : ${exception instanceof Error ? exception.stack ?? exception.message : String(exception)}`,
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'Une erreur est survenue. Réessaie dans un instant.',
      requestId,
    });
  }
}
