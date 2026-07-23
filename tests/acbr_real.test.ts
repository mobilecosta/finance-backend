import { authenticate, proxyRequest } from '../src/services/acbr';

async function runRealTests() {
  const clientId = '1l7JPNYuvVqpJUtGW1Zi';
  const clientSecret = 'bINzBI5iyXU3kYu0BdhWY2wrDEkJQUCJ';

  console.log('--- Iniciando Testes Reais da API ACBr ---');
  
  try {
    // Passo 1: Autenticação
    console.log('Passo 1: Tentando autenticação com credenciais reais...');
    const authData = await authenticate(clientId, clientSecret);
    console.log('✅ Autenticação bem-sucedida!');
    console.log('Token expira em:', authData.expires_in, 'segundos');

    // Passo 2: Consulta de Cidades (Endpoint comum para teste)
    console.log('\nPasso 2: Tentando consultar cidades (proxy request)...');
    const cidades = await proxyRequest('/nfse/cidades', authData.access_token, {
      query: { ambiente: 'homologacao' }
    });
    console.log('✅ Consulta de cidades bem-sucedida!');
    
    // Mostrar apenas as 3 primeiras cidades para não poluir o log
    if (Array.isArray(cidades)) {
        console.log('Total de cidades encontradas:', cidades.length);
        console.log('Exemplo de cidades:', cidades.slice(0, 3));
    } else {
        console.log('Resposta da API:', typeof cidades === 'object' ? JSON.stringify(cidades).substring(0, 200) : String(cidades).substring(0, 200));
    }

  } catch (error) {
    console.error('❌ Erro durante os testes reais:', (error as Error).message);
  }

  console.log('\n--- Testes Reais Concluídos ---');
}

runRealTests().catch(console.error);
