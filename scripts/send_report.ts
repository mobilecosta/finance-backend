import { sendEmail } from '../src/services/email.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const REPORT_PATH = path.resolve(process.cwd(), 'coverage', 'report.html');

async function run() {
  const recipient = process.env.REPORT_RECIPIENT || 'mobile.costa@gmail.com';
  
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('❌ Relatório não encontrado em:', REPORT_PATH);
    process.exit(1);
  }

  console.log(`📧 Enviando relatório para: ${recipient}...`);

  try {
    await sendEmail({
      to: recipient,
      subject: `Relatório de Testes ACBr - ${new Date().toLocaleString('pt-BR')}`,
      html: `
        <h1>Relatório de Testes ACBr</h1>
        <p>Os testes do ACBr foram executados com sucesso.</p>
        <p>Em anexo, você encontrará o relatório detalhado de cobertura.</p>
      `,
      attachments: [
        {
          filename: 'acbr-test-report.html',
          path: REPORT_PATH
        }
      ]
    });
    console.log('✅ Relatório enviado com sucesso!');
  } catch (error) {
    console.error('❌ Falha ao enviar relatório:', error);
    process.exit(1);
  }
}

run();
