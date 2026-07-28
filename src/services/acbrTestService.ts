import { authenticate, proxyRequest } from './acbr.js';
import { saveTestReport } from '../lib/testReporter.js';

const BASE_URL_HOM = 'https://hom.acbr.api.br';
const AUTH_URL = 'https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token';
const CLIENT_ID = '1l7JPNYuvVqpJUtGW1Zi';
const CLIENT_SECRET = 'bINzBI5iyXU3kYu0BdhWY2wrDEkJQUCJ';
const CNPJ = '66549275000197';

export interface AcbrTestStep {
  suite: string;
  name: string;
  method: string;
  url: string;
  requestBody?: unknown;
  status: 'ok' | 'fail';
  durationMs: number;
  responseData?: unknown;
  errorMessage?: string;
}

export interface AcbrTestResult {
  steps: AcbrTestStep[];
  passed: number;
  failed: number;
  total: number;
  suites: { name: string; passed: number; failed: number; total: number }[];
  durationMs: number;
}

function elapsed(start: number): number {
  return Math.round((performance.now() - start) * 100) / 100;
}

export function renderAcbrTestHtml(result: AcbrTestResult): string {
  const suitesHtml = result.suites.map(s => `
    <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
      <h3 style="margin-top: 0;">${s.name}</h3>
      <p>Passou: ${s.passed} / Falhou: ${s.failed} / Total: ${s.total}</p>
    </div>
  `).join('');

  const stepsHtml = result.steps.map((s, index) => {
    const rowId = `row-${index}`;
    const detailId = `detail-${index}`;
    
    const requestBodyStr = s.requestBody ? JSON.stringify(s.requestBody, null, 2) : 'N/A';
    const responseDataStr = s.responseData ? JSON.stringify(s.responseData, null, 2) : 'N/A';
    const errorStr = s.errorMessage || 'N/A';

    return `
      <tr id="${rowId}" style="background-color: ${s.status === 'ok' ? '#e6fffa' : '#fff5f5'}; cursor: pointer;" onclick="document.getElementById('${detailId}').style.display = document.getElementById('${detailId}').style.display === 'none' ? 'table-row' : 'none'">
        <td style="padding: 8px; border: 1px solid #ddd;">${s.suite}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${s.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${s.method} ${s.url}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${s.status}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${s.durationMs}ms</td>
      </tr>
      <tr id="${detailId}" style="display: none; background-color: #fdfdfd;">
        <td colspan="5" style="padding: 15px; border: 1px solid #ddd;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h4 style="margin-top: 0; color: #444;">Requisição (Entrada)</h4>
              <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto; max-height: 300px;">${requestBodyStr}</pre>
            </div>
            <div>
              <h4 style="margin-top: 0; color: #444;">Resposta (Saída)</h4>
              <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto; max-height: 300px;">${responseDataStr}</pre>
              ${s.status === 'fail' ? `<h4 style="color: #e53e3e;">Erro</h4><pre style="background: #fff5f5; color: #c53030; padding: 10px; border-radius: 4px; font-size: 12px;">${errorStr}</pre>` : ''}
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <html>
      <body style="font-family: sans-serif; padding: 20px;">
        <h1>Relatório de Testes ACBr</h1>
        <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
        <p>Duração Total: ${result.durationMs}ms</p>
        <h2>Suítes</h2>
        ${suitesHtml}
        <h2>Detalhes dos Passos (Clique na linha para ver detalhes)</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8f9fa">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Suíte</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Teste</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Endpoint</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Status</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Duração</th>
            </tr>
          </thead>
          <tbody>
            ${stepsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

export async function runAndSaveAcbrTests(): Promise<{ result: AcbrTestResult; html: string }> {
  const result = await runAcbrTests();
  const html = renderAcbrTestHtml(result);
  await saveTestReport(html);
  return { result, html };
}

export async function runAcbrTests(): Promise<AcbrTestResult> {
  const steps: AcbrTestStep[] = [];
  const startAll = performance.now();
  let authData: any;
  let t: number;

  // ── Suite: Manual ──────────────────────────────────────────
  t = performance.now();
  try {
    await authenticate('invalid', 'invalid');
    steps.push({ suite: 'ACBr Manual Tests', name: 'should fail authentication with invalid credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: 'Esperava erro mas autenticou' });
  } catch (e: any) {
    steps.push({ suite: 'ACBr Manual Tests', name: 'should fail authentication with invalid credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), errorMessage: e.message });
  }

  t = performance.now();
  try {
    await proxyRequest('/cidades', '');
    steps.push({ suite: 'ACBr Manual Tests', name: 'should fail proxy request without token', method: 'GET', url: `${BASE_URL_HOM}/cidades`, status: 'fail', durationMs: elapsed(t), errorMessage: 'Esperava erro mas passou' });
  } catch (e: any) {
    steps.push({ suite: 'ACBr Manual Tests', name: 'should fail proxy request without token', method: 'GET', url: `${BASE_URL_HOM}/cidades`, status: 'ok', durationMs: elapsed(t), errorMessage: e.message });
  }

  // ── Suite: Real API ────────────────────────────────────────
  t = performance.now();
  try {
    authData = await authenticate(CLIENT_ID, CLIENT_SECRET);
    steps.push({ suite: 'ACBr Real API Tests', name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), responseData: { access_token: authData.access_token?.substring(0, 20) + '...', expires_in: authData.expires_in } });
  } catch (e: any) {
    steps.push({ suite: 'ACBr Real API Tests', name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
    return buildResult(steps, startAll);
  }

  t = performance.now();
    try {
      const cidades = await proxyRequest('/nfse/cidades', authData.access_token, { query: { ambiente: 'homologacao' } });
      steps.push({ suite: 'ACBr Real API Tests', name: 'should fetch cities from ACBr API', method: 'GET', url: `${BASE_URL_HOM}/nfse/cidades?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), responseData: Array.isArray(cidades) ? { count: cidades.length, sample: cidades.slice(0, 3) } : cidades });
    } catch (e: any) {
      steps.push({ suite: 'ACBr Real API Tests', name: 'should fetch cities from ACBr API', method: 'GET', url: `${BASE_URL_HOM}/nfse/cidades?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), errorMessage: e.message, responseData: e.responseData || e });
    }

  // ── Suite: Integration ─────────────────────────────────────
  t = performance.now();
  try {
    authData = await authenticate(CLIENT_ID, CLIENT_SECRET);
    steps.push({ suite: 'ACBr Integration Tests', name: 'should authenticate successfully with real credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), responseData: { access_token: authData.access_token?.substring(0, 20) + '...', expires_in: authData.expires_in } });
  } catch (e: any) {
    steps.push({ suite: 'ACBr Integration Tests', name: 'should authenticate successfully with real credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  t = performance.now();
    try {
      const cidades = await proxyRequest('/nfse/cidades', authData.access_token, { query: { ambiente: 'homologacao' } });
      const info = Array.isArray(cidades) ? { count: cidades.length, sample: cidades.slice(0, 3) } : cidades;
      steps.push({ suite: 'ACBr Integration Tests', name: 'should fetch cities from ACBr API', method: 'GET', url: `${BASE_URL_HOM}/nfse/cidades?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), responseData: info });
    } catch (e: any) {
      steps.push({ suite: 'ACBr Integration Tests', name: 'should fetch cities from ACBr API', method: 'GET', url: `${BASE_URL_HOM}/nfse/cidades?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), errorMessage: e.message, responseData: e.responseData || e });
    }

  t = performance.now();
  try {
    await authenticate('invalid', 'invalid');
    steps.push({ suite: 'ACBr Integration Tests', name: 'should fail authentication with invalid credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: 'Esperava erro mas autenticou' });
  } catch (e: any) {
    steps.push({ suite: 'ACBr Integration Tests', name: 'should fail authentication with invalid credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), errorMessage: e.message });
  }

  // ── Suite: Create Company ──────────────────────────────────
  t = performance.now();
  try {
    authData = await authenticate(CLIENT_ID, CLIENT_SECRET);
    steps.push({ suite: 'ACBr Create Company Tests', name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), responseData: { access_token: authData.access_token?.substring(0, 20) + '...' } });
  } catch (e: any) {
    steps.push({ suite: 'ACBr Create Company Tests', name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  t = performance.now();
  try {
    try {
      const existing = await proxyRequest(`/empresas/${CNPJ}`, authData.access_token, { query: { ambiente: 'homologacao' } });
      steps.push({ suite: 'ACBr Create Company Tests', name: 'should check if company already exists', method: 'GET', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), responseData: existing });
    } catch (e: any) {
      steps.push({ suite: 'ACBr Create Company Tests', name: 'should check if company already exists', method: 'GET', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), responseData: { note: 'Empresa nao encontrada (esperado se ainda nao existe)', error: e.message } });
    }
  } catch (e: any) {
    steps.push({ suite: 'ACBr Create Company Tests', name: 'should check if company already exists', method: 'GET', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  const companyData = {
    cpf_cnpj: CNPJ, nome_razao_social: 'EMPRESA TESTE MANUS', nome_fantasia: 'TESTE MANUS',
    email: 'teste@manus.ai', fone: '11999999999',
    endereco: { logradouro: 'RUA TESTE', numero: '123', bairro: 'CENTRO', codigo_municipio: '3543303', cidade: 'Ribeirão Pires', uf: 'SP', cep: '01001000' }
  };
  t = performance.now();
  try {
    try {
            const result = await proxyRequest('/empresas', authData.access_token, {
        method: 'POST',
        body: companyData,
        query: { ambiente: 'homologacao' }
      });
      steps.push({ suite: 'ACBr Create Company Tests', name: 'should try to create company', method: 'POST', url: `${BASE_URL_HOM}/empresas?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: companyData, responseData: result });
    } catch (e: any) {
      if (e.message && e.message.includes("Empresa já cadastrada")) {
        const updateResult = await proxyRequest(`/empresas/${CNPJ}`, authData.access_token, { method: 'PUT', body: companyData, query: { ambiente: 'homologacao' } });
        steps.push({ suite: 'ACBr Create Company Tests', name: 'should try to create company', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: companyData, responseData: updateResult });
      } else {
        steps.push({ suite: 'ACBr Create Company Tests', name: 'should try to create company', method: 'POST', url: `${BASE_URL_HOM}/empresas?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: companyData, errorMessage: e.message, responseData: e.responseData || e });
      }
    }
  } catch (e: any) {
    steps.push({ suite: 'ACBr Create Company Tests', name: 'should try to create company', method: 'POST', url: `${BASE_URL_HOM}/empresas?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: companyData, errorMessage: e.message });
  }

  // ── Suite: Configure NFS-e ─────────────────────────────────
  t = performance.now();
  try {
    authData = await authenticate(CLIENT_ID, CLIENT_SECRET);
    steps.push({ suite: 'ACBr Configure NFS-e', name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), responseData: { access_token: authData.access_token?.substring(0, 20) + '...' } });
  } catch (e: any) {
    steps.push({ suite: 'ACBr Configure NFS-e', name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  const empresaUpdate = {
    cpf_cnpj: CNPJ, nome_razao_social: 'EMPRESA TESTE MANUS', nome_fantasia: 'TESTE MANUS',
    email: 'teste@manus.ai', fone: '11999999999', inscricao_municipal: '123456',
    endereco: { logradouro: 'RUA TESTE', numero: '123', bairro: 'CENTRO', codigo_municipio: '3543303', cidade: 'Ribeirão Pires', uf: 'SP', cep: '01001000' }
  };
  t = performance.now();
  try {
    try {
      const result = await proxyRequest(`/empresas/${CNPJ}`, authData.access_token, { method: 'PUT', body: empresaUpdate, query: { ambiente: 'homologacao' } });
      steps.push({ suite: 'ACBr Configure NFS-e', name: 'should update company with inscricao_municipal for NFS-e', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: empresaUpdate, responseData: result });
    } catch (e: any) {
      steps.push({ suite: 'ACBr Configure NFS-e', name: 'should update company with inscricao_municipal for NFS-e', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: empresaUpdate, errorMessage: e.message, responseData: e.responseData || e });
    }
  } catch (e: any) {
    steps.push({ suite: 'ACBr Configure NFS-e', name: 'should update company with inscricao_municipal for NFS-e', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: empresaUpdate, errorMessage: e.message });
  }

  const nfseConfig = { ambiente: 'homologacao', incentivo_fiscal: false, rps: { lote: 1, serie: '1', numero: 1 } };
  t = performance.now();
  try {
    try {
      const result = await proxyRequest(`/empresas/${CNPJ}/nfse`, authData.access_token, { method: 'PUT', body: nfseConfig, query: { ambiente: 'homologacao' } });
      steps.push({ suite: 'ACBr Configure NFS-e', name: 'should configure NFS-e for the company', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}/nfse?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: nfseConfig, responseData: result });
    } catch (e: any) {
      steps.push({ suite: 'ACBr Configure NFS-e', name: 'should configure NFS-e for the company', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}/nfse?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: nfseConfig, errorMessage: e.message, responseData: e.responseData || e });
    }
  } catch (e: any) {
    steps.push({ suite: 'ACBr Configure NFS-e', name: 'should configure NFS-e for the company', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}/nfse?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: nfseConfig, errorMessage: e.message });
  }

  // ── Suite: Issue NFS-e ─────────────────────────────────────
  t = performance.now();
  try {
    authData = await authenticate(CLIENT_ID, CLIENT_SECRET);
    steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), responseData: { access_token: authData.access_token?.substring(0, 20) + '...' } });
  } catch (e: any) {
    steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  const dpsData = {
    provedor: 'nacional',
    ambiente: 'homologacao',
    referencia: 'TESTE-MANUS-' + Date.now(),
    infDPS: {
      tpAmb: 2,
      dhEmi: new Date().toISOString(),
      verAplic: '1.01',
      serie: '1',
      nDPS: String(Math.floor(Math.random() * 1000000)),
      dCompet: new Date().toISOString().split('T')[0],
      tpEmit: 1,
      cLocEmi: '3543303',
      xLocEmi: 'Ribeirão Pires',
      prest: {
        CNPJ: CNPJ,
        im: '123456',
        razaoSocial: 'EMPRESA EXEMPLO LTDA',
        email: 'fiscal@empresa.com.br',
        regTrib: {
          opSimpNac: 1,
          regEspTrib: 0
        }
      },
      toma: {
        cpf: '12345678909',
        xNome: 'João da Silva',
        email: 'joao@email.com'
      },
      serv: {
        cLocPrestacao: '3543303',
        cServ: {
          cTribNac: '010700',
          cNBS: '101010000',
          xDescServ: 'Desenvolvimento de software sob encomenda'
        }
      },
      valores: {
        vServPrest: { vServ: 1500.00 },
        trib: {
          tribMun: { tribISSQN: 1, aliq: 2.00, vISSQN: 30.00, tpRetISS: 1 },
          totTrib: { indTotTrib: 0 }
        }
      }
    }
  };
  t = performance.now();
  try {
    try {
      const result = await proxyRequest('/nfse/dps', authData.access_token, { method: 'POST', body: dpsData, query: { ambiente: 'homologacao' } });
      steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should try to issue NFS-e (DPS)', method: 'POST', url: `${BASE_URL_HOM}/nfse/dps?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: dpsData, responseData: result });
    } catch (e: any) {
      steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should try to issue NFS-e (DPS)', method: 'POST', url: `${BASE_URL_HOM}/nfse/dps?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: dpsData, errorMessage: e.message, responseData: e.responseData || e });
    }
  } catch (e: any) {
    steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should try to issue NFS-e (DPS)', method: 'POST', url: `${BASE_URL_HOM}/nfse/dps?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: dpsData, errorMessage: e.message });
  }

  t = performance.now();
  let lastKey = '';
  if (steps.find(s => s.name === 'should try to issue NFS-e (DPS)' && s.status === 'ok')) {
    const lastStep = steps.find(s => s.name === 'should try to issue NFS-e (DPS)');
    lastKey = (lastStep?.responseData as any)?.nfse?.chave || '';
  }

  try {
    const listResult = await proxyRequest('/nfse', authData.access_token, { query: { cpf_cnpj: CNPJ, ambiente: 'homologacao', chave: lastKey } });
    steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should list NFS-e for the CNPJ', method: 'GET', url: `${BASE_URL_HOM}/nfse?cpf_cnpj=${CNPJ}&ambiente=homologacao&chave=${lastKey}`, status: 'ok', durationMs: elapsed(t), responseData: listResult });
  } catch (e: any) {
    steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should list NFS-e for the CNPJ', method: 'GET', url: `${BASE_URL_HOM}/nfse?cpf_cnpj=${CNPJ}&ambiente=homologacao&chave=${lastKey}`, status: 'fail', durationMs: elapsed(t), errorMessage: e.message, responseData: e.responseData || e });
  }

  return buildResult(steps, startAll);
}

function buildResult(steps: AcbrTestStep[], startAll: number): AcbrTestResult {
  const passed = steps.filter(s => s.status === 'ok').length;
  const failed = steps.filter(s => s.status === 'fail').length;
  const total = steps.length;
  const suitesNames = [...new Set(steps.map(s => s.suite))];
  const suites = suitesNames.map(name => {
    const suiteSteps = steps.filter(s => s.suite === name);
    return {
      name,
      passed: suiteSteps.filter(s => s.status === 'ok').length,
      failed: suiteSteps.filter(s => s.status === 'fail').length,
      total: suiteSteps.length
    };
  });

  return {
    steps,
    passed,
    failed,
    total,
    suites,
    durationMs: elapsed(startAll)
  };
}
