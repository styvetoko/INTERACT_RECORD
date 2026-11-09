import { env, resetEnvCache } from './env';

describe('configuration', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    resetEnvCache();
  });

  it('refuse de démarrer en production avec un faux fournisseur', () => {
    process.env.NODE_ENV = 'production';
    resetEnvCache();
    expect(() => env()).toThrow(/faux fournisseur interdit en production/);
  });

  it('accepte les faux fournisseurs en développement et en test', () => {
    process.env.NODE_ENV = 'development';
    resetEnvCache();
    expect(env().SMS_PROVIDER).toBe('fake');
  });
});
