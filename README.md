# Finance Pro Backend 🚀

Este é o servidor de API para o aplicativo **Finance Pro Mobile**, desenvolvido com **Node.js**, **Express**, **Prisma ORM** e **Supabase**.

## 🎯 Visão Geral

O **Finance Pro Backend** atua como o BFF (Backend for Frontend) do aplicativo mobile, gerenciando a lógica de negócio, autenticação e persistência de dados no PostgreSQL (Supabase).

## 🚀 Stack Tecnológica

- **Node.js** — Ambiente de execução JavaScript
- **Express.js** — Framework web para criação da API
- **Prisma ORM** — Gerenciamento e modelagem do banco de dados
- **Supabase (PostgreSQL)** — Banco de dados relacional
- **TypeScript** — Desenvolvimento com tipagem estática
- **pnpm** — Gerenciador de pacotes rápido e eficiente

## 🏗️ Estrutura do Projeto

```
finance-backend/
├── prisma/
│   └── schema.prisma    # Definição do banco de dados
├── src/
│   ├── controllers/     # Lógica das rotas (FinanceController)
│   ├── routes/          # Definição dos endpoints
│   ├── lib/             # Clientes e utilitários (Prisma Client)
│   └── index.ts         # Ponto de entrada do servidor
├── .env                 # Variáveis de ambiente (não versionado)
├── tsconfig.json        # Configuração do TypeScript
└── package.json         # Dependências e scripts
```

## 🛠️ Instalação e Configuração

### 1. Clonar o repositório

```bash
git clone https://github.com/mobilecosta/finance-backend.git
cd finance-backend
```

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto e adicione sua URL de conexão do Supabase:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
PORT=3000
```

### 4. Sincronizar o Banco de Dados

Use o Prisma para criar as tabelas no Supabase:

```bash
npx prisma db push
```

### 5. Iniciar o servidor

```bash
# Desenvolvimento
pnpm dev

# Produção
pnpm build
pnpm start
```

## 🔌 Endpoints da API

### Finanças (`/api/finance`)

- `GET /dashboard?userId={id}`: Retorna saldo total, contas e transações recentes.
- `GET /transactions?userId={id}`: Lista todas as transações do usuário.
- `POST /transactions`: Cria uma nova transação (atualiza automaticamente o saldo da conta).

## 🗄️ Modelo de Dados

O banco de dados é composto pelas seguintes entidades:

- **User**: Gerenciamento de usuários.
- **Account**: Contas financeiras (Ex: Carteira, Banco, Investimentos).
- **Category**: Categorias de gastos e receitas.
- **Transaction**: Registros financeiros vinculados a contas e categorias.

## 🤝 Contribuição

1. Faça um Fork do projeto
2. Crie uma Branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça o Commit de suas alterações (`git commit -m 'feat: adiciona nova feature'`)
4. Faça o Push para a Branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---
Desenvolvido por [mobilecosta](https://github.com/mobilecosta)
