import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const reportPath = path.join(process.cwd(), 'coverage', 'report.html');

async function saveCoverageReport() {
  try {
    if (!fs.existsSync(reportPath)) {
      console.error('Erro: Relatório de cobertura não encontrado em', reportPath);
      process.exit(1);
    }

    const reportHtml = fs.readFileSync(reportPath, 'utf8');

    await prisma.coverageReport.upsert({
      where: { id: 1 }, // Assumindo que sempre haverá apenas um relatório de cobertura
      update: { reportHtml: reportHtml },
      create: { id: 1, reportHtml: reportHtml },
    });

    console.log('Relatório de cobertura salvo no banco de dados com sucesso.');
  } catch (error) {
    console.error('Erro ao salvar o relatório de cobertura no banco de dados:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

saveCoverageReport();
