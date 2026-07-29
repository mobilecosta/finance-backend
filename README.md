# Finance Pro - Backend API

API de back-end para o sistema **Finance Pro**, um gerenciador de finanças pessoais com integração NFS-e via ACBr API.

Construída com **Node.js**, **Express 5**, **TypeScript**, **Prisma ORM 6**, **Supabase Auth** e **PostgreSQL**.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 22 |
| Framework | Express 5 |
| Linguagem | TypeScript 5 |
| ORM | Prisma 6 |
| Autenticação | Supabase Auth (JWT) |
| Banco | PostgreSQL (Supabase) |
| Proxy NFS-e | ACBr API |
| Testes | Jest + Supertest |
| Relatórios | jest-html-reporters, Istanbul |

---

## Sumário

- [Autenticação](#autenticacao)
- [Padrão de Mensagens](#padrao-de-mensagens)
  - [Mensagens de erro](#mensagens-de-erro)
  - [Mensagens de sucesso](#mensagens-de-sucesso)
  - [Mensagens de sucesso para coleções](#mensagens-de-sucesso-para-colecoes)
  - [Requisições para coleções](#requisicoes-para-colecoes)
    - [Paginação](#paginacao)
    - [Ordenação](#ordenacao)
    - [Filtros](#filtros)
- [API Endpoints](#api-endpoints)
  - [Auth](#apiauth)
  - [Financeiro](#apifinance)
  - [ACBr Proxy](#apiacbr)
  - [ACBr Tests](#apiacbr-tests)
  - [Jest Runner](#apitests)
  - [Utilitários](#utilitarios)
- [Configuração e Instalação](#configuracao-e-instalacao)
- [Deploy na Vercel](#deploy-na-vercel)
- [Testes](#testes)
- [Scripts](#scripts)
- [Integração NFS-e (ACBr)](#integracao-nfs-e-acbr)
  - [Arquitetura Proxy](#arquitetura-proxy)
  - [Autenticação OAuth2](#autenticacao-oauth2)
  - [Payload DPS (Schema Oficial)](#payload-dps-schema-oficial)
  - [Empresa de Teste](#empresa-de-teste)
  - [Bloqueios Conhecidos](#bloqueios-conhecidos)

---

## Autenticação

A API usa **Supabase Auth** com JWT Bearer. Rotas de finanças exigem token válido no header:

```
Authorization: Bearer <seu_token_jwt>
```

---

## Padrão de Mensagens

A API adota o padrão de mensagens do [PO UI](https://po-ui.io/guides/api) para requisições e respostas HTTP.

### Mensagens de erro

Todas as respostas com código HTTP 4xx e 5xx retornam:

```
{
    "message": "Literal descrevendo o erro para o cliente"
}
```

**Exemplos:**

```json
// 400 — validação
{ "message": "client_id e client_secret são obrigatórios" }

// 401 — autenticação
{ "message": "Token inválido ou expirado" }

// 404 — recurso não encontrado
{ "error": "Account not found" }

// 502 — erro no proxy ACBr
{ "message": "Falha na autenticação ACBr: Invalid client credentials" }

// 500 — erro interno
{ "error": "Internal server error" }
```

> **Nota:** Os controladores `Auth` e `Acbr` usam o campo `message`, enquanto `Finance` e `Tests` usam `error`. A padronização para `{ code, message, detailedMessage }` está em andamento.

### Mensagens de sucesso

Respostas com código 2xx retornam diretamente a entidade resultante da operação:

```
GET /api/finance/accounts/1

{
    "id": 1,
    "name": "Conta Corrente",
    "balance": "1000.00",
    ...
}
```

### Mensagens de sucesso para coleções

Endpoints que retornam listas utilizam o formato paginado:

```
{
    "hasNext": true,
    "items": [ ... ]
}
```

O atributo `hasNext` indica se existe uma próxima página com mais registros.

**Exemplo:**

```json
GET /api/finance/accounts?page=1&pageSize=10

{
    "hasNext": true,
    "items": [
        { "id": 1, "name": "Conta Corrente", "balance": "1000.00" },
        { "id": 2, "name": "Poupança", "balance": "5000.00" }
    ]
}
```

### Requisições para coleções

#### Paginação

A paginação é definida pelos parâmetros `page` e `pageSize`:

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `page` | number | 1 | Número da página (maior que zero) |
| `pageSize` | number | 20 | Registros por página (max 100) |

A semântica é multiplicadora: `page=2` com `pageSize=20` retorna registros 21-40.

```
GET /api/finance/transactions?page=2&pageSize=10
```

#### Ordenação

Parâmetro `order` com campos separados por vírgula:

- Campos precedidos por `-` (hífen) indicam ordem decrescente
- Campos sem sinal indicam ordem crescente

```
GET /api/finance/transactions?order=-date,amount
```

#### Filtros

Enviados como parâmetros `property=value`:

```
GET /api/finance/transactions?type=expense&status=completed
```

---

## API Endpoints

### `/api/auth`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| `POST` | `/api/auth/signup` | Não | Cria usuário |
| `POST` | `/api/auth/signin` | Não | Login email/senha |
| `GET` | `/api/auth/callback` | Não | Callback OAuth (query: `code`, `next`) |
| `POST` | `/api/auth/signout` | Sim | Logout |
| `GET` | `/api/auth/user` | Sim | Dados do usuário logado |

**signup**

```json
POST /api/auth/signup

// Request
{ "email": "user@email.com", "password": "123456", "fullName": "Nome" }

// Response 201
{
    "token": "jwt...",
    "user": { "id": "uuid", "email": "...", "name": "...", "createdAt": "..." }
}

// Response 400
{ "message": "User already registered" }
```

**signin**

```json
POST /api/auth/signin

// Request
{ "email": "user@email.com", "password": "123456" }

// Response 200
{
    "token": "jwt...",
    "user": { "id": "uuid", "email": "...", "name": "...", "createdAt": "..." }
}

// Response 401
{ "message": "Credenciais inválidas" }
```

**callback**

```
GET /api/auth/callback?code=<supabase_code>&next=/dashboard

// Response (Accept: text/html) → redirect com ?token=
// Response (JSON) → 200 { token, user }
```

**user**

```
GET /api/auth/user
Authorization: Bearer <token>

// Response 200
{ "id": "uuid", "email": "...", "name": "...", "createdAt": "..." }

// Response 401
{ "message": "Token inválido ou expirado" }
```

---

### `/api/finance`

Todas as rotas exigem `Authorization: Bearer <token>` e escopo do tenant do usuário autenticado.

#### Dashboard

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/finance/dashboard/metrics` | Métricas do dashboard |

```json
GET /api/finance/dashboard/metrics

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
    "recentTransactions": []
}
```

#### Contas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/finance/accounts` | Lista contas (paginado) |
| `GET` | `/api/finance/accounts/:id` | Conta por ID |
| `POST` | `/api/finance/accounts` | Criar conta |
| `PUT` | `/api/finance/accounts/:id` | Atualizar conta |
| `DELETE` | `/api/finance/accounts/:id` | Remover conta |

```json
GET /api/finance/accounts?page=1&pageSize=10

// Response 200
{ "hasNext": false, "items": [ { "id": 1, "name": "Conta Corrente", ... } ] }
```

```json
POST /api/finance/accounts

// Request
{ "name": "Conta Corrente", "type": "checking", "balance": 1000, "color": "#3b82f6", "icon": "wallet.pass" }

// Response 201
{ "id": 1, "tenantId": 1, "userId": "uuid", "name": "Conta Corrente", "type": "checking", "balance": "1000.00", "color": "#3b82f6", "icon": "wallet.pass", "isActive": true, "createdAt": "...", "updatedAt": "..." }

// Response 404
{ "error": "Account not found" }
```

#### Categorias

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/finance/categories` | Lista categorias (paginado) |
| `GET` | `/api/finance/categories/:id` | Categoria por ID |
| `POST` | `/api/finance/categories` | Criar categoria |
| `PUT` | `/api/finance/categories/:id` | Atualizar categoria |
| `DELETE` | `/api/finance/categories/:id` | Remover categoria |

```json
GET /api/finance/categories?page=1&pageSize=20

// Response 200
{ "hasNext": false, "items": [ { "id": 1, "name": "Alimentação", "type": "expense", ... } ] }
```

```json
POST /api/finance/categories

// Request
{ "name": "Alimentação", "type": "expense", "color": "#10b981", "icon": "tag.fill" }

// Response 201
{ "id": 1, "name": "Alimentação", "type": "expense", "color": "#10b981", "icon": "tag.fill", "isActive": true, "createdAt": "...", "updatedAt": "..." }
```

#### Transações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/finance/transactions` | Lista transações (paginado, ordenável, filtrável) |
| `POST` | `/api/finance/transactions` | Criar transação (atualiza saldo da conta) |
| `PUT` | `/api/finance/transactions/:id` | Atualizar transação (recalcula saldo) |
| `DELETE` | `/api/finance/transactions/:id` | Remover transação (reverte saldo) |

**Parâmetros de consulta (GET):**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `page` | number | Página (default 1) |
| `pageSize` | number | Itens por página (default 20, max 100) |
| `order` | string | Ordenação (ex: `-date,amount`) |
| `type` | string | Filtro por tipo (`income`, `expense`) |
| `status` | string | Filtro por status (`completed`, `pending`) |

```json
GET /api/finance/transactions?page=1&pageSize=10&order=-date&type=expense

// Response 200
{
    "hasNext": true,
    "items": [
        {
            "id": 1,
            "accountId": 1,
            "categoryId": 1,
            "type": "expense",
            "amount": "150.00",
            "description": "Mercado",
            "date": "2026-07-19",
            "status": "completed",
            "category": { "id": 1, "name": "Alimentação" },
            "account": { "id": 1, "name": "Conta Corrente" }
        }
    ]
}
```

```json
POST /api/finance/transactions

// Request
{ "accountId": 1, "categoryId": 1, "type": "expense", "amount": 150.00, "description": "Mercado", "date": "2026-07-19", "status": "completed" }

// Response 201
{ "id": 1, "type": "expense", "amount": "150.00", "description": "Mercado", "accountId": 1, "categoryId": 1, "date": "2026-07-19", "status": "completed", "createdAt": "..." }
```

---

### `/api/acbr`

Proxy genérico para a [API ACBr](https://dev.acbr.api.br). Qualquer path após `/api/acbr` é encaminhado sem transformação.

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| `POST` | `/api/acbr/auth` | Não | Autentica na ACBr |
| `*` | `/api/acbr/*` | Bearer | Proxy para ACBr (method + path + body + query) |

**Parâmetros:**

| Parâmetro | Localização | Descrição |
|-----------|-------------|-----------|
| `ambiente` | query | `homologacao` (default) ou `producao` |
| `client_id` | body (POST /auth) | Client ID ACBr |
| `client_secret` | body (POST /auth) | Client Secret ACBr |

```json
POST /api/acbr/auth

// Request
{ "client_id": "...", "client_secret": "..." }

// Response 200
{ "access_token": "jwt...", "expires_in": 3600 }

// Response 400
{ "message": "client_id e client_secret são obrigatórios" }

// Response 502
{ "message": "Falha na autenticação ACBr: <detalhes>" }
```

```json
POST /api/acbr/nfse/dps?ambiente=homologacao
Authorization: Bearer <token>

// Request
{ "provedor": "nacional", "ambiente": "homologacao", "infDPS": { ... } }

// Response 200
{ "id": "...", "status": "autorizado", "numero": "12345", ... }

// Response 401
{ "message": "Token de acesso não fornecido" }

// Response 502
{ "message": "<mensagem de erro da ACBr>" }
```

---

### `/api/acbr-tests`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/acbr-tests/run` | Executa suite de testes ACBr |

```json
POST /api/acbr-tests/run

// Response 200
{
    "success": true,
    "timestamp": "2026-07-29T12:00:00.000Z",
    "summary": { "total": 12, "passed": 10, "failed": 2, "suites": [ ... ], "durationMs": 4582 },
    "steps": [ { "suite": "...", "name": "...", "method": "POST", "url": "...", "status": "ok", "durationMs": 1234, "responseData": { ... } } ],
    "reportHtml": "<html>..."
}

// Response 500
{ "success": false, "error": "Erro ao executar testes ACBr", "details": "..." }
```

---

### `/api/tests`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/tests/run-all` | Executa Jest no serverless |
| `GET` | `/api/tests` | Lista relatórios salvos (paginado) |
| `GET` | `/api/tests/:id` | Detalhes de um relatório |
| `GET` | `/api/tests/:id/html` | HTML do relatório no navegador |

```json
GET /api/tests?page=1&pageSize=10

// Response 200
{
    "hasNext": false,
    "items": [
        { "id": 1, "date": "25/07/2026", "time": "20:30:00", "createdAt": "2026-07-25T23:30:00.000Z", "updatedAt": "2026-07-25T23:30:00.000Z" }
    ]
}
```

```json
POST /api/tests/run-all

// Response 200
{ "success": true, "message": "Testes executados com sucesso", "testId": 1, "storageUrl": null }

// Response 500
{ "success": false, "error": "Erro ao executar testes", "details": "..." }
```

---

### Utilitários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/` | Informações da API |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger UI |
| `GET` | `/tests` | Último relatório (HTML) |
| `GET` | `/tests/pdf` | Último relatório (PDF) |
| `GET` | `/coverage` | Redireciona para `/tests` |
| `GET` | `/coverage-static/*` | Arquivos LCOV |

```json
GET /health

// Response 200
{ "status": "ok", "message": "Backend is running" }
```

```json
GET /

// Response 200
{ "message": "Finance Pro API", "docs": "/docs", "coverage": "/coverage", "tests": "/tests", "health": "/health" }
```

```bash
git clone https://github.com/mobilecosta/finance-backend.git
cd finance-backend
pnpm install
```

**.env**
```env
DATABASE_URL="postgresql://user:pass@host:5432/postgres?pgbouncer=true"
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_ANON_KEY="sua_chave_anonima"
SUPABASE_SERVICE_ROLE="sua_service_role_key"
PORT=3000
NODE_ENV=development
```

```bash
npx prisma generate
npx prisma db push
```

---

## Deploy na Vercel

Configurado via `vercel.json`. Variáveis de ambiente no painel Vercel:

```bash
pnpm deploy    # vercel --prod
```

Build pipeline: `prisma generate && tsc && npx jest --coverage --no-cache && tsx scripts/saveCoverageReport.ts`

---

## Testes

### Stack

| Ferramenta | Versão | Função |
|------------|--------|--------|
| Jest | ^30.4.2 | Runner |
| ts-jest | ^29.4.11 | Transformer TS → JS (ESM) |
| Supertest | ^7.2.2 | Testes HTTP |
| jest-html-reporters | ^3.1.7 | Relatório HTML |

### Estrutura

```
tests/
├── acbr_issue_nfse.test.ts   # Emissão DPS + consulta NFS-e
├── finance.test.ts           # Health check e endpoints básicos
└── coverage.test.ts          # Rotas de relatório de cobertura
```

### Execução

```bash
pnpm test              # Local (com NODE_OPTIONS para ESM)
pnpm test:coverage     # Com relatório HTML e cobertura
```

### Pipeline de Build

O `vercel-build` executa todas as 8 suítes com `--coverage` em duas etapas:

1. Jest gera `coverage/report.html` (jest-html-reporters) + `coverage/lcov-report/index.html` (Istanbul)
2. `scripts/saveCoverageReport.ts` salva o melhor HTML na tabela `tests` e no Storage Supabase

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia servidor em modo dev (tsx watch) |
| `pnpm build` | Compila TypeScript |
| `pnpm start` | Inicia servidor em produção |
| `pnpm test` | Executa todos os testes |
| `pnpm test:coverage` | Testes com cobertura + salva relatório |
| `pnpm deploy` | Deploy na Vercel |

---

## Integração NFS-e (ACBr)

Proxy para a [API ACBr](https://dev.acbr.api.br) para emissão de NFS-e via DPS (Documento de Prestação de Serviços).

### Arquitetura Proxy

```
Cliente → POST /api/acbr/nfse/dps → Backend → POST https://hom.acbr.api.br/nfse/dps → ACBr API
         ← JSON response              ← JSON response              ← JSON response
```

O backend apenas autentica e encaminha a requisição — **sem transformação de payload**. O contrato é o schema oficial da ACBr.

### Autenticação OAuth2

```mermaid
sequenceDiagram
    Client->>Backend: POST /api/acbr/auth {client_id, client_secret}
    Backend->>ACBr Auth: POST /realms/ACBrAPI/protocol/openid-connect/token
    ACBr Auth-->>Backend: {access_token, expires_in}
    Backend-->>Client: {access_token, expires_in}
    Client->>Backend: POST /api/acbr/nfse/dps (Authorization: Bearer <token>)
    Backend->>ACBr API: POST /nfse/dps (Authorization: Bearer <token>)
    ACBr API-->>Backend: NFS-e response
    Backend-->>Client: NFS-e response
```

**Credenciais de teste:**
- `clientId`: `1l7JPNYuvVqpJUtGW1Zi`
- `clientSecret`: `bINzBI5iyXU3kYu0BdhWY2wrDEkJQUCJ`
- `cnpj`: `66549275000197` (EMPRESA TESTE MANUS — Ribeirão Pires/SP)
- Scope: `empresa nfse`

### Payload DPS (Schema Oficial)

Baseado no schema `NfseDpsPedidoEmissao` da [OpenAPI ACBr](https://prod.acbr.api.br/openapi/swagger.json).

**Endpoint:** `POST /nfse/dps`

```json
{
  "provedor": "nacional",
  "ambiente": "homologacao",
  "referencia": "MEU-ID-UNICO-123",
  "infDPS": {
    "dhEmi": "2026-07-29T12:00:00.000Z",
    "dCompet": "2026-07-29",
    "prest": {
      "CNPJ": "66549275000197"
    },
    "toma": {
      "CNPJ": "00000000000191",
      "xNome": "CLIENTE TESTE"
    },
    "serv": {
      "locPrest": {
        "cLocPrestacao": "3543303"
      },
      "cServ": {
        "cTribNac": "010700",
        "cNBS": "101010000",
        "xDescServ": "DESCRICAO DO SERVICO"
      }
    },
    "valores": {
      "vServPrest": {
        "vServ": 10.00
      },
      "trib": {
        "tribMun": {
          "tribISSQN": 1,
          "pAliq": 2.00,
          "vISSQN": 0.20
        },
        "totTrib": {
          "indTotTrib": 0
        }
      }
    }
  }
}
```

**Campos obrigatórios do `InfDPS`** (por schema):
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `dhEmi` | string (date-time) | Data/hora emissão (UTC) |
| `prest` | object | Prestador (`CNPJ` ou `CPF`) |
| `serv` | object | Serviço (`cServ` com `cTribNac`, `xDescServ`) |
| `valores` | object | Valores (`vServPrest.vServ` + `trib.tribMun`) |
| `valores.trib.tribMun.tribISSQN` | integer | 1=Tributável, 2=Imunidade, 3=Exportação, 4=Não Incidência |

**Campos opcionais do `InfDPS`**:
`tpAmb`, `verAplic`, `dCompet`, `cMotivoEmisTI`, `chNFSeRej`, `subst`, `toma`, `interm`, `IBSCBS`

**Provedores suportados:**
| Provedor | Enum | Descrição |
|----------|------|-----------|
| Padrão | `padrao` | Provedor padrão da prefeitura |
| Nacional | `nacional` | ADN — Sistema Nacional NFS-e (gov.br/nfse) |

### Empresa de Teste

**CNPJ:** `66549275000197`
**Município:** Ribeirão Pires/SP (IBGE `3543303`)
**Inscrição Municipal:** `123456`
**Ambiente:** homologação
**RPS:** lote `1`, série `001`, número `1`

Para emitir NFS-e em homologação, a empresa deve estar registrada:
1. Na ACBr API (`PUT /empresas/{cnpj}` com dados completos + `inscricao_municipal`)
2. Configuração NFS-e (`PUT /empresas/{cnpj}/nfse` com lote/série/numero)
3. Para provedor `nacional`: registro manual no [gov.br/nfse](https://www.gov.br/nfse)

### Referência ACBr

- Documentação: https://dev.acbr.api.br
- OpenAPI: https://prod.acbr.api.br/openapi/swagger.json
- Auth: `POST https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token`
- Homologação: `https://hom.acbr.api.br`
- Produção: `https://prod.acbr.api.br`

---

## Prisma Schema

Modelos:

| Modelo | Tabela | Descrição |
|--------|--------|-----------|
| `Tenant` | `tenants` | Multitenancy (1 registro default) |
| `User` | `users` | Mapeia para Supabase Auth (`openId`) |
| `Account` | `accounts` | Contas financeiras |
| `Category` | `categories` | Categorias de receita/despesa |
| `Transaction` | `transactions` | Transações (vincula account + category) |
| `Test` | `tests` | Relatórios de teste (HTML) |

---

Desenvolvido por [mobilecosta](https://github.com/mobilecosta)
