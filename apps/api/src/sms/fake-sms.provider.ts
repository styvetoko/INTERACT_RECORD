import { Injectable, Logger } from '@nestjs/common';
import { randomToken } from '../common/crypto';
import { maskPhone } from '../common/phone';
import { SmsProvider } from './sms.provider';

export interface SentSms {
  to: string;
  message: string;
  at: Date;
}

/**
 * Faux fournisseur SMS : n'envoie rien, garde les messages en mémoire.
 * En développement, le code apparaît dans les journaux du serveur.
 */
@Injectable()
export class FakeSmsProvider implements SmsProvider {
  readonly name = 'fake';
  private readonly logger = new Logger('FakeSms');
  readonly outbox: SentSms[] = [];

  async send(to: string, message: string): Promise<{ providerMessageId: string }> {
    this.outbox.push({ to, message, at: new Date() });
    if (this.outbox.length > 500) this.outbox.shift();
    if (process.env.NODE_ENV !== 'test') {
      this.logger.log(`SMS vers ${maskPhone(to)} : ${message}`);
    }
    return { providerMessageId: `fake_${randomToken(8)}` };
  }

  lastMessageTo(to: string): SentSms | undefined {
    return [...this.outbox].reverse().find((m) => m.to === to);
  }
}
