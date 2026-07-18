import { Request, Response } from 'express';
import { getPrisma } from '../lib/prisma.js';

export class FinanceController {
  async getDashboard(req: Request, res: Response) {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    try {
      const prisma = getPrisma();
      const accounts = await prisma.account.findMany({ where: { userId: String(userId) } });
      const transactions = await prisma.transaction.findMany({
        where: { userId: String(userId) },
        orderBy: { date: 'desc' },
        take: 5
      });

      const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);
      
      res.json({
        totalBalance,
        accounts,
        recentTransactions: transactions
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getTransactions(req: Request, res: Response) {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    try {
      const prisma = getPrisma();
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

  async createTransaction(req: Request, res: Response) {
    const { userId, accountId, categoryId, type, amount, description, date, status } = req.body;
    
    try {
      const prisma = getPrisma();
      const transaction = await prisma.transaction.create({
        data: {
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

      // Update account balance
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
}
