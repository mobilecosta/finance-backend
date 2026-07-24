import { authenticate, proxyRequest } from '../src/services/acbr';

describe('ACBr Manual Tests', () => {
  it('should fail authentication with invalid credentials', async () => {
    await expect(authenticate('invalid', 'invalid')).rejects.toThrow();
  });

  it('should fail proxy request without token', async () => {
    await expect(proxyRequest('/cidades', '')).rejects.toThrow();
  });
});
