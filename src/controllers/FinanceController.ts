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
      const transactions = await prisma.transaction.findMany({
        where: { userId: String(userId) },
        orderBy: { date: 'desc' },
        take: 5
      });

      const totalBalance = accounts.reduce((acc: number, curr: any) => acc + Number(curr.balance), 0);
      
      res.json({
        totalBalance,
        accounts,
        recentTransactions: transactions
      });
    } catch (error) {
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
