import request from 'supertest';
import app from '../src/index.js';
import { getPrisma } from '../src/lib/prisma.js';

describe('Finance API Endpoints', () => {
  const prisma = getPrisma();
  const userId = 'test-user-jest';
  let accountId: number;
  let categoryId: number;
  let transactionId: number;

  beforeAll(async () => {
    // Setup: Criar usuário, conta e categoria para os testes
    await prisma.user.upsert({
      where: { openId: userId },
      update: {},
      create: { openId: userId, name: 'Jest Tester' }
    });

    const account = await prisma.account.create({
      data: {
        userId,
        name: 'Jest Account',
        type: 'checking',
        balance: 1000
      }
    });
    accountId = account.id;

    const category = await prisma.category.create({
      data: {
        userId,
        name: 'Jest Category',
        type: 'expense'
      }
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.category.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { openId: userId } });
    await prisma.$disconnect();
  });

  it('GET /api/finance/dashboard - deve retornar dados do dashboard', async () => {
    const res = await request(app).get(`/api/finance/dashboard?userId=${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalBalance');
    expect(res.body).toHaveProperty('accounts');
    expect(res.body).toHaveProperty('recentTransactions');
  });

  it('GET /api/finance/transactions - deve listar transações', async () => {
    const res = await request(app).get(`/api/finance/transactions?userId=${userId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/finance/transactions - deve criar uma nova transação', async () => {
    const res = await request(app)
      .post('/api/finance/transactions')
      .send({
        userId,
        accountId,
        categoryId,
        type: 'expense',
        amount: 100,
        description: 'Test Transaction',
        date: '2026-07-19',
        status: 'completed'
      });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    transactionId = res.body.id;

    // Verificar se o saldo da conta foi atualizado (1000 - 100 = 900)
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    expect(Number(account?.balance)).toBe(900);
  });

  it('PUT /api/finance/transactions/:id - deve atualizar uma transação', async () => {
    const res = await request(app)
      .put(`/api/finance/transactions/${transactionId}`)
      .send({
        accountId,
        categoryId,
        type: 'expense',
        amount: 150, // Aumentou o gasto em 50
        description: 'Updated Test Transaction',
        date: '2026-07-19',
        status: 'completed'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe('150');

    // Verificar se o saldo da conta foi ajustado (900 - 50 = 850)
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    expect(Number(account?.balance)).toBe(850);
  });

  it('DELETE /api/finance/transactions/:id - deve excluir uma transação', async () => {
    const res = await request(app).delete(`/api/finance/transactions/${transactionId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Transaction deleted');

    // Verificar se o saldo da conta foi revertido (850 + 150 = 1000)
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    expect(Number(account?.balance)).toBe(1000);
  });

  it('GET /health - deve retornar status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET / - deve retornar mensagem inicial', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Finance Pro API');
  });
});
