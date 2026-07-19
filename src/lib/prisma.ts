let prisma: any;
let initPromise: Promise<void> | null = null;

async function initPrisma() {
  const { PrismaClient } = await import('@prisma/client') as any;
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
}

export async function getPrisma() {
  if (!prisma) {
    if (!initPromise) {
      initPromise = initPrisma();
    }
    await initPromise;
  }
  return prisma;
}
