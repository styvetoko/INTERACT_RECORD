import { Prisma } from '@prisma/client';
import { describeForLogs } from './exception.filter';

describe('journaux des erreurs (N4)', () => {
  it('ne recopie jamais les valeurs d’une requête Prisma', () => {
    const known = new Prisma.PrismaClientKnownRequestError('Unique constraint failed on +237677123456', {
      code: 'P2002', clientVersion: 'test', meta: { target: ['phone'] },
    });
    expect(describeForLogs(known)).toBe('Prisma P2002 {"target":["phone"]}');
    const validation = new Prisma.PrismaClientValidationError('Argument phone: "+237677123456" invalide', { clientVersion: 'test' });
    expect(describeForLogs(validation)).not.toContain('+237677123456');
  });
  it('garde la pile des autres erreurs pour le débogage', () => {
    expect(describeForLogs(new Error('boum'))).toContain('boum');
  });
});
