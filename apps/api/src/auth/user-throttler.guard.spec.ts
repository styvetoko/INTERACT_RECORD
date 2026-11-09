import { trackerFor } from './user-throttler.guard';

describe('compteur des limites de débit', () => {
  it('compte par utilisateur quand il est connecté, par adresse IP sinon', () => {
    expect(trackerFor({ user: { id: 'u1' }, ip: '41.202.1.1' })).toBe('user:u1');
    expect(trackerFor({ ip: '41.202.1.1' })).toBe('ip:41.202.1.1');
    expect(trackerFor({ ips: ['102.244.0.9'], ip: '10.0.0.1' })).toBe('ip:102.244.0.9');
  });
});
