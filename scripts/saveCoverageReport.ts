import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const reportHtmlPath = path.join(process.cwd(), 'coverage', 'report.html');
const reportPdfPath = path.join(process.cwd(), 'coverage', 'report.pdf');

async function saveCoverageReport() {
  try {
    console.log('Executando testes...');
    execSync('npx jest --coverage --no-cache', {
      stdio: 'inherit',
      timeout: 180000,
      env: { ...process.env, NODE_ENV: 'test', NODE_OPTIONS: '--experimental-vm-modules' },
    });

    const reportHtml = fs.readFileSync(reportHtmlPath, 'utf8');
    let reportPdf: Buffer | null = null;

    if (fs.existsSync(reportPdfPath)) {
      reportPdf = fs.readFileSync(reportPdfPath);
      console.log('Relatório PDF encontrado e será salvo.');
    }

    const { PrismaClient } = await import('@prisma/client') as any;
    const dbUrl = process.env.DATABASE_URL || '';
    const pgbouncerUrl = dbUrl.includes('pooler.supabase.com') && !dbUrl.includes('pgbouncer=true')
      ? dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true'
      : dbUrl;

    const prisma = new PrismaClient({
      datasources: { db: { url: pgbouncerUrl } },
    });

    await prisma.test.create({
      data: { reportHtml, reportPdf: reportPdf || undefined },
    });

    console.log('Relatório de testes salvo no banco de dados com sucesso.');
    await prisma.$disconnect();
  } catch (error) {
    console.error('Erro ao salvar o relatório no banco de dados:', error);
    process.exit(1);
  }
}

saveCoverageReport();
