import { authenticate, proxyRequest } from '../src/services/acbr';

describe('ACBr Integration Tests', () => {
  const clientId = '1l7JPNYuvVqpJUtGW1Zi';
  const clientSecret = 'bINzBI5iyXU3kYu0BdhWY2wrDEkJQUCJ';

  it('should authenticate successfully with real credentials', async () => {
    const authData = await authenticate(clientId, clientSecret);
    expect(authData).toBeDefined();
    expect(authData.access_token).toBeDefined();
    expect(authData.expires_in).toBeGreaterThan(0);
  });

  it('should fetch cities from ACBr API', async () => {
    const authData = await authenticate(clientId, clientSecret);
    const cidades = await proxyRequest('/nfse/cidades', authData.access_token, {
      query: { ambiente: 'homologacao' }
    });
    
    expect(cidades).toBeDefined();
    if (Array.isArray(cidades)) {
      expect(cidades.length).toBeGreaterThan(0);
    }
  });

  it('should fail authentication with invalid credentials', async () => {
    await expect(authenticate('invalid', 'invalid')).rejects.toThrow();
  });
});
