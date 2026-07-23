import { authenticate, proxyRequest } from '../src/services/acbr';

async function runTests() {
  console.log('--- Iniciando Testes Manuais da API ACBr ---');
  
  // Teste 1: Autenticação com credenciais inválidas (esperado falha)
  try {
    console.log('Teste 1: Autenticação com credenciais inválidas...');
    await authenticate('invalid', 'invalid');
    console.log('❌ Teste 1 falhou: Deveria ter retornado erro');
  } catch (error) {
    console.log('✅ Teste 1 passou: Erro retornado conforme esperado:', (error as Error).message);
  }

  // Teste 2: Proxy Request sem token (esperado falha)
  try {
    console.log('\nTeste 2: Proxy Request sem token...');
    await proxyRequest('/cidades', '');
    console.log('❌ Teste 2 falhou: Deveria ter retornado erro de autorização');
  } catch (error) {
    console.log('✅ Teste 2 passou: Erro retornado conforme esperado:', (error as Error).message);
  }

  console.log('\n--- Testes Manuais Concluídos ---');
}

runTests().catch(console.error);
