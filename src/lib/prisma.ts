let prisma: any;
let initPromise: Promise<void> | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || '';
  if (url.includes('pooler.supabase.com') && !url.includes('pgbouncer=true')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}pgbouncer=true`;
  }
  return url;
}

async function initPrisma() {
  const { PrismaClient } = await import('@prisma/client') as any;
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    datasources: {
      db: { url: getDatabaseUrl() },
    },
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
