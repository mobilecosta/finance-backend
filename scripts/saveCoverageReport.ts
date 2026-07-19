import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const reportHtmlPath = path.join(process.cwd(), 'coverage', 'report.html');
const reportPdfPath = path.join(process.cwd(), 'coverage', 'report.pdf');

async function saveCoverageReport() {
  try {
    if (!fs.existsSync(reportHtmlPath)) {
      console.error('Erro: Relatório HTML não encontrado em', reportHtmlPath);
      process.exit(1);
    }

    const reportHtml = fs.readFileSync(reportHtmlPath, 'utf8');
    let reportPdf: Buffer | null = null;

    if (fs.existsSync(reportPdfPath)) {
      reportPdf = fs.readFileSync(reportPdfPath);
      console.log('Relatório PDF encontrado e será salvo.');
    }

    await prisma.test.upsert({
      where: { id: 1 },
      update: { 
        reportHtml: reportHtml,
        reportPdf: reportPdf,
        updatedAt: new Date()
      },
      create: { 
        id: 1, 
        reportHtml: reportHtml,
        reportPdf: reportPdf
      },
    });

    console.log('Relatório de testes (HTML e PDF) salvo no banco de dados com sucesso.');
  } catch (error) {
    console.error('Erro ao salvar o relatório no banco de dados:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

saveCoverageReport();
