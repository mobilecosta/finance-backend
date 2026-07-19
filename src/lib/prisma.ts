import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getPrisma() {
  if (!prisma) {
    try {
      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      });
    } catch (error) {
      console.error('Prisma initialization error:', error);
      throw error;
    }
  }
  return prisma;
}
