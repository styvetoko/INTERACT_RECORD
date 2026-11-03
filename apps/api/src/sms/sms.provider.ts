/** Contrat commun à tous les fournisseurs SMS (faux fournisseur aujourd'hui, opérateur réel plus tard). */
export interface SmsProvider {
  readonly name: string;
  send(to: string, message: string): Promise<{ providerMessageId: string }>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
