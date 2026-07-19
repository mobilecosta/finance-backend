# Finance Pro - Backend API

Esta é a API de back-end para o sistema **Finance Pro**, um gerenciador de finanças pessoais. A API foi construída com **Node.js**, **Express 5**, **TypeScript** e **Prisma ORM**, utilizando **Supabase Auth** para autenticação e **PostgreSQL** (Supabase) como banco de dados.

## 🚀 Tecnologias Utilizadas

- **Node.js 22**
- **Express 5** (Beta)
- **TypeScript 5.7**
- **Prisma ORM 6**
- **Supabase Auth** (Autenticação JWT)
- **PostgreSQL** (Hospedado no Supabase)
- **Jest & Supertest** (Testes de Integração)

---

## 🔐 Autenticação

A API utiliza o **Supabase Auth**. Todas as rotas de finanças requerem um token JWT válido enviado no cabeçalho `Authorization`.

**Formato do cabeçalho:**
`Authorization: Bearer <seu_token_jwt>`

---

## 📑 Documentação da API

### 🔑 Autenticação (`/api/auth`)

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/auth/signup` | Cria um novo usuário (E-mail, Senha, Nome) |
| `POST` | `/api/auth/signin` | Autentica um usuário e retorna o token JWT |
| `POST` | `/api/auth/signout` | Encerra a sessão do usuário (Requer Token) |
| `GET` | `/api/auth/user` | Retorna os dados do usuário logado (Requer Token) |

---

### 💰 Finanças (`/api/finance`)
*Todas as rotas abaixo requerem autenticação.*

#### Dashboard
| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/finance/dashboard/metrics` | Retorna saldo total, contas e transações recentes |

#### Transações
| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/finance/transactions` | Lista todas as transações do usuário |
| `POST` | `/api/finance/transactions` | Cria uma transação (atualiza o saldo da conta) |
| `PUT` | `/api/finance/transactions/:id` | Atualiza uma transação (ajusta o saldo da conta) |
| `DELETE` | `/api/finance/transactions/:id` | Remove uma transação (reverte o saldo da conta) |

---

## 🛠️ Configuração e Instalação

### 1. Clonar o Repositório
```bash
git clone https://github.com/mobilecosta/finance-backend.git
cd finance-backend
```

### 2. Instalar Dependências
```bash
pnpm install
```

### 3. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
DATABASE_URL="sua_url_do_postgresql_supabase"
SUPABASE_URL="sua_url_do_projeto_supabase"
SUPABASE_ANON_KEY="sua_chave_anonima_do_supabase"
PORT=3000
NODE_ENV=development
```

### 4. Banco de Dados
```bash
npx prisma generate
npx prisma db push
```

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia o servidor em modo de desenvolvimento |
| `pnpm build` | Compila o projeto para JavaScript |
| `pnpm start` | Inicia o servidor em produção |
| `pnpm test` | Executa os testes de integração |
| `pnpm test:coverage` | Executa testes e gera relatório de cobertura |

---

## 🐳 Deploy na Vercel

O projeto está configurado para deploy automático na Vercel via arquivo `vercel.json`. Certifique-se de configurar as variáveis de ambiente no painel da Vercel.

---
Desenvolvido por [mobilecosta](https://github.com/mobilecosta)
