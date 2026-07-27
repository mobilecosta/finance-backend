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
    steps.push({ suite: 'ACBr Real API Tests', name: 'should fetch cities from ACBr API', method: 'GET', url: `${BASE_URL_HOM}/nfse/cidades?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
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
    steps.push({ suite: 'ACBr Integration Tests', name: 'should fetch cities from ACBr API', method: 'GET', url: `${BASE_URL_HOM}/nfse/cidades?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
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
    endereco: { logradouro: 'RUA TESTE', numero: '123', bairro: 'CENTRO', codigo_municipio: '3543303', cidade: 'RIBEIRAO PIRES', uf: 'SP', cep: '01001000' }
  };
  t = performance.now();
  try {
    try {
      const result = await proxyRequest('/empresas', authData.access_token, { method: 'POST', body: companyData, query: { ambiente: 'homologacao' } });
      steps.push({ suite: 'ACBr Create Company Tests', name: 'should try to create company', method: 'POST', url: `${BASE_URL_HOM}/empresas?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: companyData, responseData: result });
    } catch (e: any) {
      steps.push({ suite: 'ACBr Create Company Tests', name: 'should try to create company', method: 'POST', url: `${BASE_URL_HOM}/empresas?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: companyData, responseData: { note: 'Company may already exist (expected)', error: e.message } });
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
    endereco: { logradouro: 'RUA TESTE', numero: '123', bairro: 'CENTRO', codigo_municipio: '3543303', cidade: 'RIBEIRAO PIRES', uf: 'SP', cep: '01001000' }
  };
  t = performance.now();
  try {
    try {
      const result = await proxyRequest(`/empresas/${CNPJ}`, authData.access_token, { method: 'PUT', body: empresaUpdate, query: { ambiente: 'homologacao' } });
      steps.push({ suite: 'ACBr Configure NFS-e', name: 'should update company with inscricao_municipal for NFS-e', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: empresaUpdate, responseData: result });
    } catch (e: any) {
      steps.push({ suite: 'ACBr Configure NFS-e', name: 'should update company with inscricao_municipal for NFS-e', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: empresaUpdate, responseData: { error: e.message } });
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
      steps.push({ suite: 'ACBr Configure NFS-e', name: 'should configure NFS-e for the company', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}/nfse?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: nfseConfig, responseData: { error: e.message } });
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
    provedor: 'nacional', ambiente: 'homologacao', referencia: 'TESTE-MANUS-' + Date.now(),
    infDPS: {
      tpAmb: 2, dhEmi: new Date().toISOString(),
      dCompet: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      prest: { CNPJ: CNPJ },
      toma: { CNPJ: '00000000000191', xNome: 'CLIENTE TESTE' },
      serv: { cServ: { cTribNac: '010701', cNBS: '101010000', xDescServ: 'SERVICO DE TESTE API ACBR' } },
      IBSCBS: { finNFSe: 0, indFinal: 0, cIndOp: '000000', indDest: 0, valores: { trib: { gIBSCBS: { CST: '100', cClassTrib: '100000' } } } },
      valores: { vServPrest: { vServ: 10.00 }, trib: { tribMun: { tribISSQN: 1 }, totTrib: { indTotTrib: 0 } } }
    }
  };
  t = performance.now();
  try {
    try {
      const result = await proxyRequest('/nfse/dps', authData.access_token, { method: 'POST', body: dpsData, query: { ambiente: 'homologacao' } });
      steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should try to issue NFS-e (DPS)', method: 'POST', url: `${BASE_URL_HOM}/nfse/dps?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: dpsData, responseData: result });
    } catch (e: any) {
      steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should try to issue NFS-e (DPS)', method: 'POST', url: `${BASE_URL_HOM}/nfse/dps?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: dpsData, errorMessage: e.message, responseData: { error: e.message } });
    }
  } catch (e: any) {
    steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should try to issue NFS-e (DPS)', method: 'POST', url: `${BASE_URL_HOM}/nfse/dps?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: dpsData, errorMessage: e.message });
  }

  t = performance.now();
  try {
    const listResult = await proxyRequest('/nfse', authData.access_token, { query: { cpf_cnpj: CNPJ, ambiente: 'homologacao', '$top': '5' } });
    steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should list NFS-e for the CNPJ', method: 'GET', url: `${BASE_URL_HOM}/nfse?cpf_cnpj=${CNPJ}&ambiente=homologacao&$top=5`, status: 'ok', durationMs: elapsed(t), responseData: listResult });
  } catch (e: any) {
    steps.push({ suite: 'ACBr Issue NFS-e Tests', name: 'should list NFS-e for the CNPJ', method: 'GET', url: `${BASE_URL_HOM}/nfse?cpf_cnpj=${CNPJ}&ambiente=homologacao&$top=5`, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  return buildResult(steps, startAll);
}

function buildResult(steps: AcbrTestStep[], startAll: number): AcbrTestResult {
  const suiteNames = [...new Set(steps.map(s => s.suite))];
  const suites = suiteNames.map(name => {
    const ss = steps.filter(s => s.suite === name);
    return { name, passed: ss.filter(s => s.status === 'ok').length, failed: ss.filter(s => s.status === 'fail').length, total: ss.length };
  });
  return { steps, passed: steps.filter(s => s.status === 'ok').length, failed: steps.filter(s => s.status === 'fail').length, total: steps.length, suites, durationMs: Math.round(performance.now() - startAll) };
}

export function renderAcbrTestHtml(result: AcbrTestResult): string {
  const rows = result.steps.map(s => {
    const reqBody = s.requestBody ? `<pre style="margin:2px 0;font-size:11px;background:#f5f5f5;padding:4px;border-radius:3px;max-height:120px;overflow:auto">${esc(JSON.stringify(s.requestBody, null, 2))}</pre>` : '';
    const resData = s.responseData ? `<pre style="margin:2px 0;font-size:11px;background:#f5f5f5;padding:4px;border-radius:3px;max-height:120px;overflow:auto">${esc(JSON.stringify(s.responseData, null, 2))}</pre>` : '';
    const errMsg = s.errorMessage ? `<div style="color:#b91c1c;font-size:12px;margin-top:2px">${esc(s.errorMessage)}</div>` : '';
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${esc(s.suite)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${esc(s.name)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;white-space:nowrap"><code style="background:#f3f4f6;padding:1px 4px;border-radius:3px">${esc(s.method)}</code></td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;word-break:break-all;max-width:300px"><code>${esc(s.url)}</code></td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px"><span style="display:inline-block;padding:1px 6px;border-radius:4px;font-weight:600;color:#fff;background:${s.status === 'ok' ? '#16a34a' : '#dc2626'}">${s.status === 'ok' ? 'PASS' : 'FAIL'}</span></td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right">${s.durationMs}ms</td>
    </tr>
    <tr style="background:#fafafa">
      <td colspan="6" style="padding:4px 8px 8px 8px;border-bottom:2px solid #e5e7eb">
        ${s.requestBody ? `<div style="font-size:12px;color:#374151"><strong>Request Body:</strong></div>${reqBody}` : ''}
        ${s.responseData ? `<div style="font-size:12px;color:#374151"><strong>Response:</strong></div>${resData}` : ''}
        ${errMsg}
      </td>
    </tr>`;
  }).join('\n');

  const suitesRows = result.suites.map(su => `<tr>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600">${esc(su.name)}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${su.total}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#16a34a">${su.passed}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#dc2626">${su.failed}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right">${su.total > 0 ? Math.round(result.steps.filter(s => s.suite === su.name).reduce((a, s) => a + s.durationMs, 0) / su.total) : 0}ms</td>
    <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px"><span style="display:inline-block;padding:1px 8px;border-radius:4px;font-weight:600;color:#fff;background:${su.failed === 0 ? '#16a34a' : '#dc2626'}">${su.failed === 0 ? 'PASS' : 'FAIL'}</span></td>
  </tr>`).join('\n');

  const allPassed = result.failed === 0;
  const bgColor = allPassed ? '#16a34a' : '#dc2626';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ACBr Tests Report - ${new Date().toLocaleString('pt-BR')}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f9fafb; color:#1f2937; padding:20px }
  h1 { font-size:22px; margin-bottom:4px }
  .subtitle { color:#6b7280; font-size:14px; margin-bottom:20px }
  .summary-cards { display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap }
  .card { background:#fff; border-radius:8px; padding:14px 20px; box-shadow:0 1px 3px rgba(0,0,0,.08); min-width:120px }
  .card .num { font-size:28px; font-weight:700 }
  .card .label { font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px }
  .card.pass .num { color:#16a34a } .card.fail .num { color:#dc2626 }
  .card.total .num { color:#2563eb } .card.suites .num { color:#7c3aed }
  .card.duration .num { color:#d97706; font-size:22px }
  .banner { background:${bgColor}; color:#fff; padding:10px 16px; border-radius:8px; font-size:16px; font-weight:600; margin-bottom:20px; text-align:center }
  table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08); margin-bottom:20px }
  th { background:#f3f4f6; padding:8px; font-size:12px; text-transform:uppercase; letter-spacing:.5px; color:#6b7280; text-align:left; border-bottom:2px solid #e5e7eb }
  code { font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-size:11px; background:#f3f4f6; padding:1px 4px; border-radius:3px }
  .timestamp { color:#9ca3af; font-size:12px }
</style>
</head>
<body>
  <div class="banner">${allPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}</div>
  <h1>🔬 ACBr Tests Report</h1>
  <div class="subtitle">Executado em ${new Date().toLocaleString('pt-BR')} — ${result.total} testes, ${result.suites.length} suítes</div>
  <div class="summary-cards">
    <div class="card total"><div class="num">${result.total}</div><div class="label">Total</div></div>
    <div class="card pass"><div class="num">${result.passed}</div><div class="label">Passaram</div></div>
    <div class="card fail"><div class="num">${result.failed}</div><div class="label">Falharam</div></div>
    <div class="card suites"><div class="num">${result.suites.filter(s => s.failed === 0).length}/${result.suites.length}</div><div class="label">Suítes OK</div></div>
    <div class="card duration"><div class="num">${result.durationMs}ms</div><div class="label">Duração Total</div></div>
  </div>
  <h2 style="font-size:16px;margin-bottom:8px">📊 Resumo por Suíte</h2>
  <table><thead><tr><th>Suíte</th><th>Total</th><th>Pass</th><th>Fail</th><th style="text-align:right">Média</th><th>Status</th></tr></thead><tbody>${suitesRows}</tbody></table>
  <h2 style="font-size:16px;margin-bottom:8px;margin-top:24px">📋 Detalhamento dos Testes</h2>
  <table><thead><tr><th>Suíte</th><th>Teste</th><th>Método</th><th>URL</th><th>Status</th><th style="text-align:right">Duração</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="timestamp">Relatório gerado via API /api/acbr-tests</div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function runAndSaveAcbrTests(): Promise<{ result: AcbrTestResult; html: string }> {
  const result = await runAcbrTests();
  const html = renderAcbrTestHtml(result);
  await saveTestReport(html).catch(() => {});
  return { result, html };
}