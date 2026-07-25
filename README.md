# Finance Pro - Backend API

Esta é a API de back-end para o sistema **Finance Pro**, um gerenciador de finanças pessoais. A API foi construída com **Node.js**, **Express 5**, **TypeScript** e **Prisma ORM**, utilizando **Supabase Auth** para autenticação e **PostgreSQL** (Supabase) como banco de dados.

## Tecnologias Utilizadas

- **Node.js 22**
- **Express 5**
- **TypeScript**
- **Prisma ORM 6**
- **Supabase Auth** (Autenticação JWT)
- **PostgreSQL** (Hospedado no Supabase)
- **Jest & Supertest** (Testes de Integração)
- **Supabase Storage** (Relatórios de cobertura)

---

## Autenticação

A API utiliza o **Supabase Auth**. Todas as rotas de finanças requerem um token JWT válido enviado no cabeçalho `Authorization`.

**Formato:**
```
Authorization: Bearer <seu_token_jwt>
```

---

## API Endpoints

### Autenticação (`/api/auth`)

| Método | Endpoint | Autenticação | Descrição |
|--------|----------|-------------|-----------|
| `POST` | `/api/auth/signup` | Não | Cria um novo usuário |
| `POST` | `/api/auth/signin` | Não | Autentica e retorna token JWT |
| `GET` | `/api/auth/callback` | Não | Callback para confirmação de email (query: `code`, `next`) |
| `POST` | `/api/auth/signout` | Sim | Encerra a sessão |
| `GET` | `/api/auth/user` | Sim | Retorna dados do usuário logado |

**signup**
```json
// Request
{ "email": "user@email.com", "password": "123456", "fullName": "Nome" }
// Response 201
{ "token": "jwt...", "user": { "id": "uuid", "email": "user@email.com", "name": "Nome", "createdAt": "2026-01-01T00:00:00.000Z" } }
```

**signin**
```json
// Request
{ "email": "user@email.com", "password": "123456" }
// Response 200
{ "token": "jwt...", "user": { "id": "uuid", "email": "user@email.com", "name": "Nome", "createdAt": "2026-01-01T00:00:00.000Z" } }
```

**callback**
```
GET /api/auth/callback?code=<supabase_code>&next=/dashboard
// Response: redirect com token na URL ou JSON { token, user }
```

**user** (Requer Token)
```
GET /api/auth/user
// Response 200: { "id": "uuid", "email": "user@email.com", "name": "Nome", "createdAt": "..." }
```

---

### Financeiro (`/api/finance`)
*Todas as rotas abaixo requerem autenticação.*

#### Dashboard

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/finance/dashboard/metrics` | Retorna métricas do dashboard |

```json
// Response 200
{
  "totalBalance": 5000.00,
  "totalIncome": 10000.00,
  "totalExpense": 5000.00,
  "transactionCount": 42,
  "monthlyData": [
    { "month": "2026-07", "income": 3000, "expense": 1500 }
  ],
  "categoryDistribution": [
    { "category": "Alimentação", "amount": 1200, "percentage": 24 }
  ],
  "recentTransactions": [ /* últimas 5 transações */ ]
}
```

#### Contas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/finance/accounts` | Lista todas as contas |
| `GET` | `/api/finance/accounts/:id` | Retorna uma conta |
| `POST` | `/api/finance/accounts` | Cria uma nova conta |
| `PUT` | `/api/finance/accounts/:id` | Atualiza uma conta |
| `DELETE` | `/api/finance/accounts/:id` | Remove uma conta |

```json
// POST/PUT Request
{ "name": "Conta Corrente", "type": "checking", "balance": 1000, "color": "#3b82f6", "icon": "wallet.pass" }

// Response
{ "id": 1, "tenantId": 1, "userId": "uuid", "name": "Conta Corrente", "type": "checking", "balance": "1000.00", "color": "#3b82f6", "icon": "wallet.pass", "isActive": true, "createdAt": "...", "updatedAt": "..." }
```

#### Categorias

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/finance/categories` | Lista todas as categorias |
| `GET` | `/api/finance/categories/:id` | Retorna uma categoria |
| `POST` | `/api/finance/categories` | Cria uma nova categoria |
| `PUT` | `/api/finance/categories/:id` | Atualiza uma categoria |
| `DELETE` | `/api/finance/categories/:id` | Remove uma categoria |

```json
// POST/PUT Request
{ "name": "Alimentação", "type": "expense", "color": "#10b981", "icon": "tag.fill" }

// Response
{ "id": 1, "tenantId": 1, "userId": "uuid", "name": "Alimentação", "type": "expense", "color": "#10b981", "icon": "tag.fill", "isActive": true, "createdAt": "...", "updatedAt": "..." }
```

#### Transações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/finance/transactions` | Lista transações do usuário |
| `POST` | `/api/finance/transactions` | Cria uma transação (atualiza saldo da conta) |
| `PUT` | `/api/finance/transactions/:id` | Atualiza uma transação (ajusta saldo da conta) |
| `DELETE` | `/api/finance/transactions/:id` | Remove uma transação (reverte saldo da conta) |

```json
// POST Request
{ "accountId": 1, "categoryId": 1, "type": "expense", "amount": 150.00, "description": "Mercado", "date": "2026-07-19", "status": "completed" }

// PUT Request (mesmo body, todos opcionais)
{ "amount": 200.00, "description": "Atualizado" }

// GET Response (array)
[{ "id": 1, "tenantId": 1, "userId": "uuid", "accountId": 1, "categoryId": 1, "type": "expense", "amount": "150.00", "description": "Mercado", "date": "2026-07-19", "status": "completed", "paymentMethod": null, "createdAt": "...", "updatedAt": "...", "category": { ... }, "account": { ... } }]
```

---

### Utilitários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/` | Informações da API |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Documentação Swagger |
| `GET` | `/tests` | Relatório de testes (HTML) |
| `GET` | `/tests/pdf` | Relatório de testes (PDF) |
| `GET` | `/coverage` | Relatório de cobertura (HTML) |
| `POST` | `/coverage` | Salva relatório de cobertura no banco |

```json
// GET /
{ "message": "Finance Pro API", "docs": "/docs", "coverage": "/coverage", "tests": "/tests", "health": "/health" }

// GET /health
{ "status": "ok", "message": "Backend is running" }

// POST /coverage
{ "reportHtml": "<html>...</html>", "reportPdf": "base64..." }
// Response 201
{ "message": "Relatório salvo com sucesso", "id": 1 }
```

---

## Configuração e Instalação

### 1. Clonar
```bash
git clone https://github.com/mobilecosta/finance-backend.git
cd finance-backend
```

### 2. Instalar dependências
```bash
pnpm install
```

### 3. Variáveis de Ambiente
Crie um arquivo `.env` na raiz:
```env
DATABASE_URL="postgresql://user:pass@host:5432/postgres?pgbouncer=true"
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_ANON_KEY="sua_chave_anonima"
SUPABASE_SERVICE_ROLE="sua_service_role_key"
PORT=3000
NODE_ENV=development
```

### 4. Banco de Dados
```bash
npx prisma generate
npx prisma db push
```

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia servidor em modo dev |
| `pnpm build` | Compila TypeScript |
| `pnpm start` | Inicia servidor em produção |
| `pnpm test` | Executa testes de integração |
| `pnpm test:coverage` | Executa testes com cobertura e salva relatório |
| `pnpm deploy` | Faz deploy na Vercel |

---

## Deploy na Vercel

O projeto está configurado para deploy na Vercel via `vercel.json`. Configure as variáveis de ambiente no painel da Vercel e faça deploy com:

```bash
pnpm deploy
```

---

## Testes

### Stack

| Ferramenta | Versão | Função |
|------------|--------|--------|
| **Jest** | ^30.4.2 | Runner de testes |
| **ts-jest** | ^29.4.11 | Transformer TypeScript → JS (ESM) |
| **Supertest** | ^7.2.2 | Testes HTTP |
| **jest-html-reporters** | ^3.1.7 | Relatório HTML |
| **jest-environment-node** | ^30.x | Ambiente Node para Jest |

### Estrutura

```
tests/
├── acbr_manual.test.ts         # Teste manual da API ACBr (proxy)
├── acbr_real.test.ts           # Testes reais contra endpoints ACBr
├── acbr_integration.test.ts    # Testes de integração com ACBr
├── acbr_create_company.test.ts # Criação de empresa no ACBr
├── acbr_configure_nfse.test.ts # Configuração de empresa + NFS-e
├── acbr_issue_nfse.test.ts     # Emissão de DPS + consulta NFS-e
├── finance.test.ts             # Health check e endpoints básicos
└── coverage.test.ts            # Rotas de relatório de cobertura
```

### Resultado Atual

```
Test Suites: 7 passed, 1 failed, 8 total
Tests:       18 passed, 4 failed, 22 total
```

- **7 suítes passam** (ACBr + Finance)
- **1 suíte falha** (`coverage.test.ts`) — requer `DATABASE_URL` em ambiente local. Funciona em produção com as envs configuradas.

### Execução

```bash
# Local (com NODE_OPTIONS para ESM)
pnpm test

# Com relatório HTML e cobertura
pnpm test:coverage

# Apenas suítes ACBr
NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules npx jest --testPathPatterns="acbr"
```

### Configuração do Jest

Arquivo: `jest.config.js` (ESM, type: module)

```js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { useESM: true }] },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  reporters: ['default', ['jest-html-reporters', { publicPath: './coverage', filename: 'report.html' }]],
};
```

> **Nota:** O preset `ts-jest/presets/default-esm` resolve para o arquivo `jest-preset.js` dentro do diretório `node_modules/ts-jest/presets/default-esm/`. Jest automaticamente anexa `/jest-preset` ao nome do preset quando não é um caminho absoluto.

### Execução em Serverless (Vercel)

O endpoint `POST /api/tests/run-all` executa Jest dentro do ambiente serverless Vercel com as seguintes particularidades:

1. **Config temporária:** Gera `jest.config.cjs` em `/tmp/` com caminhos absolutos para evitar dependência de resolução de módulo relativa.
2. **Filesystem read-only:** O diretório `/var/task` (cwd) é somente leitura. Output de cobertura vai para `/tmp/coverage`.
3. **HOME=/tmp:** Necessário para npm cache em ambiente serverless.
4. **NODE_PATH setado:** `NODE_PATH=/var/task/node_modules` para que o `require()` de módulos como `jest-environment-node` funcione mesmo quando a config está em `/tmp/`.
5. **Preset absoluto:** O preset `ts-jest/presets/default-esm/jest-preset.js` é passado como caminho absoluto para evitar erro `"not found relative to rootDir"`.

```typescript
// Lógica central (TestController.runAllTests)
const tmpConfig = '/tmp/jest.config.cjs';
const presetFile = '/var/task/node_modules/ts-jest/presets/default-esm/jest-preset.js';

execSync(
  `node --experimental-vm-modules "${jestBin}" --config "${tmpConfig}" --rootDir "${cwd}" --no-cache`,
  { cwd, env: { ...process.env, NODE_PATH: path.resolve(cwd, 'node_modules'), HOME: '/tmp', NODE_ENV: 'test' } }
);
```

### Pipeline de Build

No `vercel-build`, o script `scripts/run_acbr_tests.ts` executa `npx jest --testPathPatterns="acbr"` e salva o relatório:

1. Jest executa as 6 suítes ACBr.
2. Relatório HTML é gerado em `coverage/report.html`.
3. `src/lib/testReporter.ts` salva o HTML na tabela `tests` do banco e envia email (se `SMTP_USER`/`SMTP_PASS` configurados).
4. `scripts/saveCoverageReport.ts` também salva o relatório de cobertura.

---

## Integração NFS-e (ACBr)

Integração com a API **ACBr** ([docs.opencode.ai/acbr](https://docs.opencode.ai/acbr)) para emissão de Nota Fiscal de Serviço eletrônica (NFS-e) via DPS.

### Provedor

| Provedor | Status | Observação |
|----------|--------|------------|
| `ISSSaoPaulo` (padrao) | ❌ Bloqueado | Provedor local SP — não possui URL de homologação no ACBr |
| `nacional` (ADN) | ⚠️ Homologação | Sistema Nacional (gov.br/nfse) — DPS processada, retorno `E0120` |

### Payload DPS (`InfDPS`)

```json
{
  "serv": {
    "cServ": {
      "cTribNac": "010701",
      "cNBS": "101010000",
      "xDescServ": "Serviço de desenvolvimento de sistemas",
      "IBSCBS": {
        "CST": "100",
        "cClassTrib": "100000",
        "indTotTrib": 0
      }
    }
  },
  "valores": {
    "vServ": 1.00,
    "vDescIncond": 0.00,
    "vDescCond": 0.00,
    "vDeducao": 0.00,
    "vIss": 0.05,
    "vAliq": 0.05,
    "trib": {
      "totTrib": 0.00,
      "indTotTrib": 0
    }
  },
  "prest": { "CNPJ": "66549275000197", "xNome": "Finance Pro Teste Ltda" },
  "tom": { "CNPJ": "00000000000191", "xNome": "Tomador Teste Ltda" },
  "comp": { "cMun": 3543303 }
}
```

### Empresa e Configuração NFS-e

- **CNPJ:** `66549275000197`
- **Inscrição Municipal:** `123456`
- **IBGE:** `3543303`
- **RPS:** `lote: 1`, `serie: "1"`, `numero: 1`
- **Ambiente:** homologação (`2`)

### Bloqueios Conhecidos

1. **Provedor `ISSSaoPaulo`:** Retorna `"URL de Homologação não informada"` — provedor local SP sem suporte a homologação no ACBr.
2. **Provedor `nacional`:** DPS processada mas retorna `E0120` — `"IM do prestador não deve ser informado, pois não existem informações complementares registradas no CNC NFS-e do município emissor"`. A empresa precisa ser registrada manualmente em [gov.br/nfse](https://www.gov.br/nfse).

### Setup das Variáveis de Ambiente

```env
ACBR_BASE_URL="https://proxy.api.acbr.net.br"
ACBR_TOKEN="seu_token_acbr"
```

Desenvolvido por [mobilecosta](https://github.com/mobilecosta)
