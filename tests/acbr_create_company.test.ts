import { authenticate, proxyRequest } from '../src/services/acbr';

async function runCreateCompanyTest() {
  const clientId = '1l7JPNYuvVqpJUtGW1Zi';
  const clientSecret = 'bINzBI5iyXU3kYu0BdhWY2wrDEkJQUCJ';
  const cnpj = '66549275000197';

  console.log('--- Iniciando Teste de Criação de Empresa na API ACBr ---');
  
  try {
    // Passo 1: Autenticação
    console.log('Passo 1: Autenticando...');
    const authData = await authenticate(clientId, clientSecret);
    console.log('✅ Autenticação bem-sucedida!');

    // Passo 2: Verificar se a empresa já existe
    console.log('\nPasso 2: Verificando se a empresa já existe...');
    try {
        const existing = await proxyRequest(`/empresas/${cnpj}`, authData.access_token, {
            query: { ambiente: 'homologacao' }
        });
        console.log('ℹ️ Empresa já cadastrada:', existing.nome_razao_social);
        return;
    } catch (e) {
        console.log('ℹ️ Empresa não encontrada, procedendo com o cadastro.');
    }

    // Passo 3: Cadastrar Empresa
    console.log('\nPasso 3: Tentando cadastrar empresa...');
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
        codigo_municipio: '3550308', // São Paulo
        cidade: 'SAO PAULO',
        uf: 'SP',
        cep: '01001000'
      }
    };

    const result = await proxyRequest('/empresas', authData.access_token, {
      method: 'POST',
      body: companyData,
      query: { ambiente: 'homologacao' }
    });
    
    console.log('✅ Empresa cadastrada com sucesso!');
    console.log('Resultado:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Erro durante o teste de criação:', (error as Error).message);
  }

  console.log('\n--- Teste de Criação Concluído ---');
}

runCreateCompanyTest().catch(console.error);
