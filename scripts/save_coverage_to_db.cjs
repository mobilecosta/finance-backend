const fs = require('fs');
const path = require('path');

async function run() {
  const reportPath = path.join(process.cwd(), 'coverage', 'report.html');
  
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Relatório de cobertura não encontrado em:', reportPath);
    return;
  }

  const reportHtml = fs.readFileSync(reportPath, 'utf8');
  console.log('--- Salvando Relatório de Cobertura no Banco ---');

  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.test.create({
        data: { reportHtml }
      });
      console.log('✅ Relatório de cobertura gravado na tabela "tests".');
      await prisma.$disconnect();
    } catch (e) {
      console.log('ℹ️ Erro ao gravar no banco:', e.message);
    }
  } else {
    console.log('ℹ️ DATABASE_URL não definida ou incompatível, pulando gravação no banco.');
  }
  
  console.log('✅ Processo concluído.');
}

run().catch(console.error);
