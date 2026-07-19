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

Desenvolvido por [mobilecosta](https://github.com/mobilecosta)
