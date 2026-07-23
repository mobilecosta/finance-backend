import { authenticate, proxyRequest } from '../src/services/acbr';

async function runIssueNfseTest() {
  const clientId = '1l7JPNYuvVqpJUtGW1Zi';
  const clientSecret = 'bINzBI5iyXU3kYu0BdhWY2wrDEkJQUCJ';
  const cnpj = '66549275000197';

  console.log('--- Iniciando Teste de Emissão de NFS-e na API ACBr ---');
  
  try {
    // Passo 1: Autenticando
    console.log('Passo 1: Autenticando...');
    const authData = await authenticate(clientId, clientSecret);
    console.log('✅ Autenticação bem-sucedida!');

    // Passo 2: Tentar emitir NFS-e (DPS)
    console.log('\nPasso 2: Tentando enviar DPS para emissão de NFS-e...');
    const dpsData = {
      provedor: 'padrao',
      ambiente: 'homologacao',
      referencia: 'TESTE-MANUS-' + Date.now(),
      infDPS: {
        tpAmb: 2, // Homologação
        dhEmi: new Date().toISOString(),
        prest: {
          CNPJ: cnpj
        },
        toma: {
          CNPJ: '00000000000191',
          xNome: 'CLIENTE TESTE'
        },
        serv: {
          cServ: { cServ: "01.01" }, // Ajustando para objeto conforme esperado pela API
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
      console.log('✅ Requisição de emissão enviada com sucesso!');
      console.log('Resultado:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('ℹ️ A API retornou um erro (esperado se não houver certificado configurado):');
      console.log(e instanceof Error ? e.message : JSON.stringify(e));
    }

    // Passo 3: Listar NFS-e para o CNPJ
    console.log('\nPasso 3: Listando NFS-e existentes para o CNPJ...');
    const listResult = await proxyRequest('/nfse', authData.access_token, {
      query: { 
        cpf_cnpj: cnpj,
        ambiente: 'homologacao',
        '$top': '5'
      }
    });
    console.log('✅ Consulta de lista de NFS-e realizada!');
    console.log('Total encontrado:', listResult['@count'] || 0);
    if (listResult.data) {
        console.log('Dados (primeiros registros):', JSON.stringify(listResult.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Erro inesperado durante o teste:', (error as Error).message);
  }

  console.log('\n--- Teste de NFS-e Concluído ---');
}

runIssueNfseTest().catch(console.error);
