import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Execução de Testes ACBr via Jest ---');
  
  try {
    // Executa apenas o teste de integração do ACBr
    execSync('NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules npx jest tests/acbr_integration.test.ts --reporters=default --reporters=jest-html-reporters', {
      stdio: 'inherit'
    });
    
    console.log('✅ Testes concluídos com sucesso.');
  } catch (error) {
    console.error('❌ Alguns testes falharam, mas continuaremos para salvar o relatório.');
  }

  // O jest-html-reporters salva em coverage/report.html conforme configurado no jest.config.js
  const reportPath = path.resolve(process.cwd(), 'coverage', 'report.html');
  
  if (fs.existsSync(reportPath)) {
    const reportHtml = fs.readFileSync(reportPath, 'utf-8');
    
    try {
      await prisma.test.create({
        data: {
          reportHtml: reportHtml
        }
      });
      console.log('✅ Relatório de testes ACBr salvo na tabela "tests".');
    } catch (dbError) {
      console.error('❌ Erro ao salvar no banco de dados:', dbError);
    }
  } else {
    console.error('❌ Relatório HTML não encontrado em:', reportPath);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
