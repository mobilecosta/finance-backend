import { execSync } from 'child_process';
import { saveTestReport, sendTestReportEmail } from '../src/lib/testReporter.js';

async function main() {
  console.log('--- Iniciando Execução de Testes ACBr via Jest ---');
  
  try {
    execSync('NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules npx jest --testPathPatterns="acbr"', {
      stdio: 'inherit'
    });
    
    console.log('✅ Testes concluídos com sucesso.');
  } catch (error) {
    console.error('❌ Alguns testes falharam, mas continuaremos para salvar o relatório.');
  }

  const emailTo = process.env.TEST_REPORT_EMAIL || 'mobile.costa@gmail.com';
  await saveTestReport();
  await sendTestReportEmail(emailTo);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
