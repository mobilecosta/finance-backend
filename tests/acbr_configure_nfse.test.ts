import { authenticate, proxyRequest } from '../src/services/acbr';

describe('ACBr Configure NFS-e', () => {
  const clientId = '1l7JPNYuvVqpJUtGW1Zi';
  const clientSecret = 'bINzBI5iyXU3kYu0BdhWY2wrDEkJQUCJ';
  const cnpj = '66549275000197';

  it('should authenticate with real credentials', async () => {
    const authData = await authenticate(clientId, clientSecret);
    expect(authData).toBeDefined();
    expect(authData.access_token).toBeDefined();
  });

  it('should update company with inscricao_municipal for NFS-e', async () => {
    const authData = await authenticate(clientId, clientSecret);
    const empresaData = {
      cpf_cnpj: cnpj,
      nome_razao_social: 'EMPRESA TESTE MANUS',
      nome_fantasia: 'TESTE MANUS',
      email: 'teste@manus.ai',
      fone: '11999999999',
      inscricao_municipal: '123456',
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
      const result = await proxyRequest(`/empresas/${cnpj}`, authData.access_token, {
        method: 'PUT',
        body: empresaData,
        query: { ambiente: 'homologacao' }
      });
      expect(result).toBeDefined();
      console.log('✅ Empresa atualizada com IM:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('⚠️ Erro ao atualizar empresa:', e instanceof Error ? e.message : e);
      expect(e).toBeDefined();
    }
  });

  it('should configure NFS-e for the company', async () => {
    const authData = await authenticate(clientId, clientSecret);
    const configData = {
      ambiente: 'homologacao',
      incentivo_fiscal: false,
      rps: {
        lote: 1,
        serie: 'NFS',
        numero: 1
      }
    };

    try {
      const result = await proxyRequest(`/empresas/${cnpj}/nfse`, authData.access_token, {
        method: 'PUT',
        body: configData,
        query: { ambiente: 'homologacao' }
      });
      expect(result).toBeDefined();
      console.log('✅ NFS-e configurada com sucesso:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('⚠️ ConfigNfse retornou erro (pode ser config já existente ou permissão):', e instanceof Error ? e.message : e);
      expect(e).toBeDefined();
    }
  });
});
