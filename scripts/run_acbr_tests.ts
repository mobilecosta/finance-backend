import { execSync } from 'child_process';
import { saveTestReport, sendTestReportEmail } from '../src/lib/testReporter.js';

async function main() {
  console.log('--- Iniciando Execução de Todos os Testes com Coverage ---');
  
  try {
    execSync('NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules npx jest --coverage --no-cache', {
      stdio: 'inherit',
      timeout: 300000,
    });
    console.log('✅ Todos os testes passaram.');
  } catch (error) {
    console.error('⚠️ Alguns testes falharam — relatório parcial será salvo.');
  }

  const emailTo = process.env.TEST_REPORT_EMAIL || 'mobile.costa@gmail.com';
  await saveTestReport();
  await sendTestReportEmail(emailTo);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
