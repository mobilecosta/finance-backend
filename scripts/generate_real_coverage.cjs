const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('--- Iniciando Geração de Cobertura Real ---');
  
  try {
    // Executa o jest e gera o relatório HTML padrão (LCOV)
    console.log('Executando Jest...');
    execSync('export NODE_OPTIONS="--experimental-vm-modules" && npx jest tests/finance.test.ts --coverage --coverageReporters="html" --no-cache', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: "file:./prisma/dev.db" }
    });
  } catch (e) {
    console.log('Aviso: Jest terminou com alguns erros (esperado), mas o relatório deve ter sido gerado.');
  }

  const reportPath = path.join(process.cwd(), 'coverage', 'index.html');
  
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Relatório de cobertura (index.html) não encontrado em:', reportPath);
    // Tenta o report.html se o index.html não existir
    const altPath = path.join(process.cwd(), 'coverage', 'report.html');
    if (!fs.existsSync(altPath)) return;
  }

  const finalPath = fs.existsSync(reportPath) ? reportPath : path.join(process.cwd(), 'coverage', 'report.html');
  const reportHtml = fs.readFileSync(finalPath, 'utf8');

  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.test.create({
        data: { reportHtml }
      });
      console.log('✅ Relatório de cobertura REAL gravado na tabela "tests".');
      await prisma.$disconnect();
    } catch (e) {
      console.log('ℹ️ Erro ao gravar no banco:', e.message);
    }
  }
}

run().catch(console.error);
