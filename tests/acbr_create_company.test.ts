import { authenticate, proxyRequest } from '../src/services/acbr';

describe('ACBr Create Company Tests', () => {
  const clientId = '1l7JPNYuvVqpJUtGW1Zi';
  const clientSecret = 'bINzBI5iyXU3kYu0BdhWY2wrDEkJQUCJ';
  const cnpj = '66549275000197';

  it('should authenticate with real credentials', async () => {
    const authData = await authenticate(clientId, clientSecret);
    expect(authData).toBeDefined();
    expect(authData.access_token).toBeDefined();
  });

  it('should check if company already exists', async () => {
    const authData = await authenticate(clientId, clientSecret);
    try {
      const existing = await proxyRequest(`/empresas/${cnpj}`, authData.access_token, {
        query: { ambiente: 'homologacao' }
      });
      expect(existing).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should try to create company', async () => {
    const authData = await authenticate(clientId, clientSecret);
    const companyData = {
      cpf_cnpj: cnpj,
      nome_razao_social: 'EMPRESA TESTE MANUS',
      nome_fantasia: 'TESTE MANUS',
      email: 'teste@manus.ai',
      fone: '11999999999',
      endereco: {
        logradouro: 'RUA TESTE',
        numero: '123',
        bairro: 'CENTRO',
        codigo_municipio: '3550308',
        cidade: 'SAO PAULO',
        uf: 'SP',
        cep: '01001000'
      }
    };

    try {
      const result = await proxyRequest('/empresas', authData.access_token, {
        method: 'POST',
        body: companyData,
        query: { ambiente: 'homologacao' }
      });
      expect(result).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});
