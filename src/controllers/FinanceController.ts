import { getPrisma } from '../lib/prisma.js';

type Res = {
  status(code: number): Res;
  json(body: any): void;
  setHeader(name: string, value: string): void;
};

type Req = {
  headers: { authorization?: string };
  body?: any;
  query: any;
  params: any;
  user?: any;
};

export class FinanceController {
  async getDashboard(req: Req, res: Res) {
    const user = req.user;
    const userId = user.id;

    try {
      const prisma = await getPrisma();
      const accounts = await prisma.account.findMany({ where: { userId: String(userId) } });
      const allTransactions = await prisma.transaction.findMany({
        where: { userId: String(userId) },
        include: { category: true },
        orderBy: { date: 'desc' },
      });

      const totalBalance = accounts.reduce((acc: number, curr: any) => acc + Number(curr.balance), 0);
      const totalIncome = allTransactions.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      const totalExpense = allTransactions.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      const transactionCount = allTransactions.length;
      const recentTransactions = allTransactions.slice(0, 5);

      const monthMap: Record<string, { income: number; expense: number }> = {};
      for (const t of allTransactions) {
        const month = t.date.substring(0, 7);
        if (!monthMap[month]) monthMap[month] = { income: 0, expense: 0 };
        if (t.type === 'income') monthMap[month].income += Number(t.amount);
        else monthMap[month].expense += Number(t.amount);
      }
      const monthlyData = Object.entries(monthMap).map(([month, data]) => ({ month, ...data }));

      const catMap: Record<string, { amount: number; count: number }> = {};
      for (const t of allTransactions) {
        const catName = t.category?.name || 'Sem categoria';
        if (!catMap[catName]) catMap[catName] = { amount: 0, count: 0 };
        catMap[catName].amount += Number(t.amount);
        catMap[catName].count++;
      }
      const totalCatAmount = Object.values(catMap).reduce((s, c) => s + c.amount, 0);
      const categoryDistribution = Object.entries(catMap).map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalCatAmount > 0 ? Math.round((data.amount / totalCatAmount) * 100) : 0,
      }));

      res.json({
        totalBalance,
        totalIncome,
        totalExpense,
        transactionCount,
        monthlyData,
        categoryDistribution,
        recentTransactions,
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getTransactions(req: Req, res: Res) {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    try {
      const prisma = await getPrisma();
      const transactions = await prisma.transaction.findMany({
        where: { userId: String(userId) },
        include: { category: true, account: true },
        orderBy: { date: 'desc' }
      });
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createTransaction(req: Req, res: Res) {
    const user = req.user;
    const userId = user.id;
    const { accountId, categoryId, type, amount, description, date, status } = req.body;
    
    try {
      const prisma = await getPrisma();
      const transaction = await prisma.transaction.create({
        data: {
          tenantId: 1,
          userId,
          accountId,
          categoryId,
          type,
          amount,
          description,
          date,
          status
        }
      });

      const modifier = type === 'income' ? 1 : -1;
      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: Number(amount) * modifier
          }
        }
      });

      res.status(201).json(transaction);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateTransaction(req: Req, res: Res) {
    const { id } = req.params;
    const { accountId, categoryId, type, amount, description, date, status } = req.body;

    try {
      const prisma = await getPrisma();
      
      const oldTransaction = await prisma.transaction.findUnique({
        where: { id: Number(id) }
      });

      if (!oldTransaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const transaction = await prisma.transaction.update({
        where: { id: Number(id) },
        data: {
          accountId,
          categoryId,
          type,
          amount,
          description,
          date,
          status
        }
      });

      if (oldTransaction.accountId === accountId) {
        const oldModifier = oldTransaction.type === 'income' ? 1 : -1;
        const newModifier = type === 'income' ? 1 : -1;
        const diff = (Number(amount) * newModifier) - (Number(oldTransaction.amount) * oldModifier);
        
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: { increment: diff } }
        });
      }

      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteTransaction(req: Req, res: Res) {
    const { id } = req.params;

    try {
      const prisma = await getPrisma();
      const transaction = await prisma.transaction.findUnique({
        where: { id: Number(id) }
      });

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      await prisma.transaction.delete({
        where: { id: Number(id) }
      });

      const modifier = transaction.type === 'income' ? -1 : 1;
      await prisma.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: Number(transaction.amount) * modifier
          }
        }
      });

      res.json({ message: 'Transaction deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
