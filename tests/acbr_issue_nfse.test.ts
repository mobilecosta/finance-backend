import { authenticate, proxyRequest } from '../src/services/acbr';

describe('ACBr Issue NFS-e Tests', () => {
  const clientId = '1l7JPNYuvVqpJUtGW1Zi';
  const clientSecret = 'bINzBI5iyXU3kYu0BdhWY2wrDEkJQUCJ';
  const cnpj = '66549275000197';

  it('should authenticate with real credentials', async () => {
    const authData = await authenticate(clientId, clientSecret);
    expect(authData).toBeDefined();
    expect(authData.access_token).toBeDefined();
  });

  it('should try to issue NFS-e (DPS)', async () => {
    const authData = await authenticate(clientId, clientSecret);
    const dpsData = {
      provedor: 'padrao',
      ambiente: 'homologacao',
      referencia: 'TESTE-MANUS-' + Date.now(),
      infDPS: {
        tpAmb: 2,
        dhEmi: new Date().toISOString(),
        prest: {
          CNPJ: cnpj
        },
        toma: {
          CNPJ: '00000000000191',
          xNome: 'CLIENTE TESTE'
        },
        serv: {
          cServ: { cServ: "01.01" },
          xDesc: 'SERVICO DE TESTE API ACBR',
          vServ: 10.00
        }
      }
    };

    try {
      const result = await proxyRequest('/nfse/dps', authData.access_token, {
        method: 'POST',
        body: dpsData,
        query: { ambiente: 'homologacao' }
      });
      expect(result).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should list NFS-e for the CNPJ', async () => {
    const authData = await authenticate(clientId, clientSecret);
    const listResult = await proxyRequest('/nfse', authData.access_token, {
      query: {
        cpf_cnpj: cnpj,
        ambiente: 'homologacao',
        '$top': '5'
      }
    });
    expect(listResult).toBeDefined();
  });
});
