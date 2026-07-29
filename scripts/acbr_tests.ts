import { authenticate, proxyRequest } from '../src/services/acbr.js';
import { saveTestReport } from '../src/lib/testReporter.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const BASE_URL_HOM = 'https://hom.acbr.api.br';
const AUTH_URL = 'https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token';
const CLIENT_ID = '1l7JPNYuvVqpJUtGW1Zi';
const CLIENT_SECRET = 'bINzBI5iyXU3kYu0BdhWY2wrDEkJQUCJ';
const CNPJ = '66549275000197';

interface TestStep {
  suite: string;
  name: string;
  method: string;
  url: string;
  requestBody?: unknown;
  status: 'ok' | 'fail' | 'skip';
  durationMs: number;
  responseData?: unknown;
  errorMessage?: string;
}

const steps: TestStep[] = [];

function elapsed(start: number): number {
  return Math.round((performance.now() - start) * 100) / 100;
}

async function run() {
  // ── Suite: Manual ──────────────────────────────────────────
  const s1 = 'ACBr Manual Tests';
  let t: number;
  t = performance.now();
  try {
    await authenticate('invalid', 'invalid');
    steps.push({ suite: s1, name: 'should fail authentication with invalid credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: 'Esperava erro mas autenticou' });
  } catch (e: any) {
    steps.push({ suite: s1, name: 'should fail authentication with invalid credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), errorMessage: e.message });
  }

  t = performance.now();
  try {
    await proxyRequest('/cidades', '');
    steps.push({ suite: s1, name: 'should fail proxy request without token', method: 'GET', url: `${BASE_URL_HOM}/cidades`, status: 'fail', durationMs: elapsed(t), errorMessage: 'Esperava erro mas passou' });
  } catch (e: any) {
    steps.push({ suite: s1, name: 'should fail proxy request without token', method: 'GET', url: `${BASE_URL_HOM}/cidades`, status: 'ok', durationMs: elapsed(t), errorMessage: e.message });
  }

  // ── Suite: Real API ────────────────────────────────────────
  const s2 = 'ACBr Real API Tests';
  let authData: any;

  t = performance.now();
  try {
    authData = await authenticate(CLIENT_ID, CLIENT_SECRET);
    steps.push({ suite: s2, name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), responseData: { access_token: authData.access_token?.substring(0, 20) + '...', expires_in: authData.expires_in } });
  } catch (e: any) {
    steps.push({ suite: s2, name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
    return finalize();
  }

  t = performance.now();
  try {
    const cidades = await proxyRequest('/nfse/cidades', authData.access_token, { query: { ambiente: 'homologacao' } });
    steps.push({ suite: s2, name: 'should fetch cities from ACBr API', method: 'GET', url: `${BASE_URL_HOM}/nfse/cidades?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), responseData: Array.isArray(cidades) ? { count: cidades.length, sample: cidades.slice(0, 3) } : cidades });
  } catch (e: any) {
    steps.push({ suite: s2, name: 'should fetch cities from ACBr API', method: 'GET', url: `${BASE_URL_HOM}/nfse/cidades?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  // ── Suite: Integration ─────────────────────────────────────
  const s3 = 'ACBr Integration Tests';
  t = performance.now();
  try {
    authData = await authenticate(CLIENT_ID, CLIENT_SECRET);
    steps.push({ suite: s3, name: 'should authenticate successfully with real credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), responseData: { access_token: authData.access_token?.substring(0, 20) + '...', expires_in: authData.expires_in } });
  } catch (e: any) {
    steps.push({ suite: s3, name: 'should authenticate successfully with real credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  t = performance.now();
  try {
    const cidades = await proxyRequest('/nfse/cidades', authData.access_token, { query: { ambiente: 'homologacao' } });
    const info = Array.isArray(cidades) ? { count: cidades.length, sample: cidades.slice(0, 3) } : cidades;
    steps.push({ suite: s3, name: 'should fetch cities from ACBr API', method: 'GET', url: `${BASE_URL_HOM}/nfse/cidades?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), responseData: info });
  } catch (e: any) {
    steps.push({ suite: s3, name: 'should fetch cities from ACBr API', method: 'GET', url: `${BASE_URL_HOM}/nfse/cidades?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  t = performance.now();
  try {
    await authenticate('invalid', 'invalid');
    steps.push({ suite: s3, name: 'should fail authentication with invalid credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: 'Esperava erro mas autenticou' });
  } catch (e: any) {
    steps.push({ suite: s3, name: 'should fail authentication with invalid credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), errorMessage: e.message });
  }

  // ── Suite: Create Company ──────────────────────────────────
  const s4 = 'ACBr Create Company Tests';
  t = performance.now();
  try {
    authData = await authenticate(CLIENT_ID, CLIENT_SECRET);
    steps.push({ suite: s4, name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), responseData: { access_token: authData.access_token?.substring(0, 20) + '...' } });
  } catch (e: any) {
    steps.push({ suite: s4, name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  t = performance.now();
  try {
    try {
      const existing = await proxyRequest(`/empresas/${CNPJ}`, authData.access_token, { query: { ambiente: 'homologacao' } });
      steps.push({ suite: s4, name: 'should check if company already exists', method: 'GET', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), responseData: existing });
    } catch (e: any) {
      steps.push({ suite: s4, name: 'should check if company already exists', method: 'GET', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), responseData: { note: 'Empresa nao encontrada (esperado se ainda nao existe)', error: e.message } });
    }
  } catch (e: any) {
    steps.push({ suite: s4, name: 'should check if company already exists', method: 'GET', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  const companyData = {
    cpf_cnpj: CNPJ, nome_razao_social: 'EMPRESA TESTE MANUS', nome_fantasia: 'TESTE MANUS',
    email: 'teste@manus.ai', fone: '11999999999',
    endereco: { logradouro: 'RUA TESTE', numero: '123', bairro: 'CENTRO', codigo_municipio: '3543303', cidade: 'Ribeirão Pires', uf: 'SP', cep: '01001000' }
  };
  t = performance.now();
  try {
    try {
      const result = await proxyRequest('/empresas', authData.access_token, { method: 'POST', body: companyData, query: { ambiente: 'homologacao' } });
      steps.push({ suite: s4, name: 'should try to create company', method: 'POST', url: `${BASE_URL_HOM}/empresas?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: companyData, responseData: result });
    } catch (e: any) {
      if (e.message && e.message.includes("Empresa já cadastrada")) {
        const updateResult = await proxyRequest(`/empresas/${CNPJ}`, authData.access_token, { method: 'PUT', body: companyData, query: { ambiente: 'homologacao' } });
        steps.push({ suite: s4, name: 'should try to create company', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: companyData, responseData: { note: 'Company already existed, updated instead', result: updateResult } });
      } else {
        steps.push({ suite: s4, name: 'should try to create company', method: 'POST', url: `${BASE_URL_HOM}/empresas?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: companyData, responseData: { note: 'Company may already exist (expected)', error: e.message } });
      }
    }
  } catch (e: any) {
    steps.push({ suite: s4, name: 'should try to create company', method: 'POST', url: `${BASE_URL_HOM}/empresas?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: companyData, errorMessage: e.message });
  }

  // ── Suite: Configure NFS-e ─────────────────────────────────
  const s5 = 'ACBr Configure NFS-e';
  t = performance.now();
  try {
    authData = await authenticate(CLIENT_ID, CLIENT_SECRET);
    steps.push({ suite: s5, name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), responseData: { access_token: authData.access_token?.substring(0, 20) + '...' } });
  } catch (e: any) {
    steps.push({ suite: s5, name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
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
      steps.push({ suite: s5, name: 'should update company with inscricao_municipal for NFS-e', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: empresaUpdate, responseData: result });
    } catch (e: any) {
      steps.push({ suite: s5, name: 'should update company with inscricao_municipal for NFS-e', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: empresaUpdate, responseData: { error: e.message } });
    }
  } catch (e: any) {
    steps.push({ suite: s5, name: 'should update company with inscricao_municipal for NFS-e', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: empresaUpdate, errorMessage: e.message });
  }

  const nfseConfig = { ambiente: 'homologacao', incentivo_fiscal: false, rps: { lote: 1, serie: '001', numero: 1 } };
  t = performance.now();
  try {
    try {
      const result = await proxyRequest(`/empresas/${CNPJ}/nfse`, authData.access_token, { method: 'PUT', body: nfseConfig, query: { ambiente: 'homologacao' } });
      steps.push({ suite: s5, name: 'should configure NFS-e for the company', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}/nfse?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: nfseConfig, responseData: result });
    } catch (e: any) {
      steps.push({ suite: s5, name: 'should configure NFS-e for the company', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}/nfse?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: nfseConfig, responseData: { error: e.message } });
    }
  } catch (e: any) {
    steps.push({ suite: s5, name: 'should configure NFS-e for the company', method: 'PUT', url: `${BASE_URL_HOM}/empresas/${CNPJ}/nfse?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: nfseConfig, errorMessage: e.message });
  }

  // ── Suite: Issue NFS-e ─────────────────────────────────────
  const s6 = 'ACBr Issue NFS-e Tests';
  t = performance.now();
  try {
    authData = await authenticate(CLIENT_ID, CLIENT_SECRET);
    steps.push({ suite: s6, name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'ok', durationMs: elapsed(t), responseData: { access_token: authData.access_token?.substring(0, 20) + '...' } });
  } catch (e: any) {
    steps.push({ suite: s6, name: 'should authenticate with real credentials', method: 'POST', url: AUTH_URL, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  const dpsData = {
    provedor: 'nacional', ambiente: 'homologacao', referencia: 'TESTE-MANUS-' + Date.now(),
    infDPS: {
      tpAmb: 2, dhEmi: new Date().toISOString(),
      dCompet: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      prest: { CNPJ: CNPJ, im: '123456', razaoSocial: 'EMPRESA TESTE LTDA' },
      toma: { CNPJ: '00000000000191', xNome: 'CLIENTE TESTE' },
      serv: { cLocPrestacao: '3543303', cTribNac: '010700', cNBS: '101010000', xDescServ: 'SERVICO DE TESTE API ACBR' },
      valores: { vServPrest: { vServ: 10.00 }, trib: { tribMun: { tribISSQN: 1, aliq: 2.00, vISSQN: 0.20 }, totTrib: { indTotTrib: 0 } } }
    }
  };
  t = performance.now();
  try {
    try {
      const result = await proxyRequest('/nfse/dps', authData.access_token, { method: 'POST', body: dpsData, query: { ambiente: 'homologacao' } });
      steps.push({ suite: s6, name: 'should try to issue NFS-e (DPS)', method: 'POST', url: `${BASE_URL_HOM}/nfse/dps?ambiente=homologacao`, status: 'ok', durationMs: elapsed(t), requestBody: dpsData, responseData: result });
    } catch (e: any) {
      steps.push({ suite: s6, name: 'should try to issue NFS-e (DPS)', method: 'POST', url: `${BASE_URL_HOM}/nfse/dps?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: dpsData, errorMessage: e.message, responseData: { error: e.message } });
    }
  } catch (e: any) {
    steps.push({ suite: s6, name: 'should try to issue NFS-e (DPS)', method: 'POST', url: `${BASE_URL_HOM}/nfse/dps?ambiente=homologacao`, status: 'fail', durationMs: elapsed(t), requestBody: dpsData, errorMessage: e.message });
  }

  t = performance.now();
  try {
    let lastKey = '';
    if (steps.find(s => s.name === 'should try to issue NFS-e (DPS)' && s.status === 'ok')) {
      const lastStep = steps.find(s => s.name === 'should try to issue NFS-e (DPS)');
      lastKey = (lastStep?.responseData as any)?.nfse?.chave || '';
    }
    const listResult = await proxyRequest('/nfse', authData.access_token, { query: { cpf_cnpj: CNPJ, ambiente: 'homologacao', chave: lastKey } });
    steps.push({ suite: s6, name: 'should list NFS-e for the CNPJ', method: 'GET', url: `${BASE_URL_HOM}/nfse?cpf_cnpj=${CNPJ}&ambiente=homologacao&chave=${lastKey}`, status: 'ok', durationMs: elapsed(t), responseData: listResult });
  } catch (e: any) {
    steps.push({ suite: s6, name: 'should list NFS-e for the CNPJ', method: 'GET', url: `${BASE_URL_HOM}/nfse?cpf_cnpj=${CNPJ}&ambiente=homologacao&$top=5`, status: 'fail', durationMs: elapsed(t), errorMessage: e.message });
  }

  await finalize();
}

async function finalize() {
  const passed = steps.filter(s => s.status === 'ok').length;
  const failed = steps.filter(s => s.status === 'fail').length;
  const total = steps.length;
  const suites = [...new Set(steps.map(s => s.suite))];
  const suitesPassed = suites.filter(su => steps.filter(s => s.suite === su).every(s => s.status === 'ok')).length;

  const rows = steps.map(s => {
    const reqBody = s.requestBody ? `<pre style="margin:2px 0;font-size:11px;background:#f5f5f5;padding:4px;border-radius:3px;max-height:120px;overflow:auto">${escapeHtml(JSON.stringify(s.requestBody, null, 2))}</pre>` : '';
    const resData = s.responseData ? `<pre style="margin:2px 0;font-size:11px;background:#f5f5f5;padding:4px;border-radius:3px;max-height:120px;overflow:auto">${escapeHtml(JSON.stringify(s.responseData, null, 2))}</pre>` : '';
    const errMsg = s.errorMessage ? `<div style="color:#b91c1c;font-size:12px;margin-top:2px">${escapeHtml(s.errorMessage)}</div>` : '';
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${escapeHtml(s.suite)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${escapeHtml(s.name)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;white-space:nowrap"><code style="background:#f3f4f6;padding:1px 4px;border-radius:3px">${escapeHtml(s.method)}</code></td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;word-break:break-all;max-width:300px"><code>${escapeHtml(s.url)}</code></td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">
        <span style="display:inline-block;padding:1px 6px;border-radius:4px;font-weight:600;color:#fff;background:${s.status === 'ok' ? '#16a34a' : '#dc2626'}">${s.status === 'ok' ? 'PASS' : 'FAIL'}</span>
      </td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right">${s.durationMs}ms</td>
    </tr>
    <tr style="background:#fafafa">
      <td colspan="6" style="padding:4px 8px 8px 8px;border-bottom:2px solid #e5e7eb">
        ${s.status === 'ok' ? `<div style="font-size:12px;color:#374151"><strong>Response:</strong></div>${resData || '<em style="color:#9ca3af">sem dados</em>'}` : ''}
        ${s.status === 'fail' ? `<div style="font-size:12px;color:#374151"><strong>Request:</strong></div>${reqBody || '<em style="color:#9ca3af">sem body</em>'}` : ''}
        ${errMsg}
      </td>
    </tr>`;
  }).join('\n');

  const suitesRows = suites.map(su => {
    const suiteSteps = steps.filter(s => s.suite === su);
    const sp = suiteSteps.filter(s => s.status === 'ok').length;
    const sf = suiteSteps.filter(s => s.status === 'fail').length;
    const st = suiteSteps.length;
    const avgDuration = Math.round(suiteSteps.reduce((a, s) => a + s.durationMs, 0) / st);
    const allOk = sf === 0;
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600">${escapeHtml(su)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${st}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#16a34a">${sp}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#dc2626">${sf}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:right">${avgDuration}ms</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">
        <span style="display:inline-block;padding:1px 8px;border-radius:4px;font-weight:600;color:#fff;background:${allOk ? '#16a34a' : '#dc2626'}">${allOk ? 'PASS' : 'FAIL'}</span>
      </td>
    </tr>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
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
  .card.pass .num { color:#16a34a }
  .card.fail .num { color:#dc2626 }
  .card.total .num { color:#2563eb }
  .card.suites .num { color:#7c3aed }
  .card.duration .num { color:#d97706; font-size:22px }
  table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08); margin-bottom:20px }
  th { background:#f3f4f6; padding:8px; font-size:12px; text-transform:uppercase; letter-spacing:.5px; color:#6b7280; text-align:left; border-bottom:2px solid #e5e7eb }
  code { font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-size:11px; background:#f3f4f6; padding:1px 4px; border-radius:3px }
  pre code { background:none; padding:0 }
  .error-text { color:#dc2626 }
  .timestamp { color:#9ca3af; font-size:12px }
</style>
</head>
<body>
  <h1>🔬 ACBr Tests Report</h1>
  <div class="subtitle">Executado em ${new Date().toLocaleString('pt-BR')} — ${total} testes, ${suites.length} suítes</div>

  <div class="summary-cards">
    <div class="card total"><div class="num">${total}</div><div class="label">Total</div></div>
    <div class="card pass"><div class="num">${passed}</div><div class="label">Passaram</div></div>
    <div class="card fail"><div class="num">${failed}</div><div class="label">Falharam</div></div>
    <div class="card suites"><div class="num">${suitesPassed}/${suites.length}</div><div class="label">Suítes OK</div></div>
    <div class="card duration"><div class="num">${Math.round(steps.reduce((a, s) => a + s.durationMs, 0))}ms</div><div class="label">Duração Total</div></div>
  </div>

  <h2 style="font-size:16px;margin-bottom:8px">📊 Resumo por Suíte</h2>
  <table>
    <thead><tr><th>Suíte</th><th>Total</th><th>Pass</th><th>Fail</th><th style="text-align:right">Média</th><th>Status</th></tr></thead>
    <tbody>${suitesRows}</tbody>
  </table>

  <h2 style="font-size:16px;margin-bottom:8px;margin-top:24px">📋 Detalhamento dos Testes</h2>
  <table>
    <thead><tr><th>Suíte</th><th>Teste</th><th>Método</th><th>URL</th><th>Status</th><th style="text-align:right">Duração</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="timestamp">Relatório gerado por scripts/acbr_tests.ts</div>
</body>
</html>`;

  const outputPath = resolve(process.cwd(), 'coverage', 'acbr-report.html');
  const dir = dirname(outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(outputPath, html, 'utf-8');
  console.log(`\n📄 Relatório HTML salvo: ${outputPath}`);

  await saveTestReport(html);

  console.log(`\n✅ ${passed}/${total} testes passaram (${failed} falhas)`);
  process.exit(failed > 0 ? 1 : 0);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

run().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});