import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const REPORT_PATH = path.resolve(process.cwd(), 'coverage', 'report.html');
const COVERAGE_SUMMARY_PATH = path.resolve(process.cwd(), 'coverage', 'coverage-summary.json');

function getReportHtml(): string | null {
  if (fs.existsSync(REPORT_PATH)) {
    return fs.readFileSync(REPORT_PATH, 'utf-8');
  }
  return null;
}

function getCoverageSummary(): { statements: number; branches: number; functions: number; lines: number } | null {
  try {
    if (fs.existsSync(COVERAGE_SUMMARY_PATH)) {
      const raw = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf-8'));
      const total = raw.total;
      if (total) {
        return {
          statements: total.statements?.pct ?? 0,
          branches: total.branches?.pct ?? 0,
          functions: total.functions?.pct ?? 0,
          lines: total.lines?.pct ?? 0,
        };
      }
    }
  } catch {}
  return null;
}

function buildEmailHtml(reportHtml?: string): string {
  const coverage = getCoverageSummary();
  let summary = '<h2>Resumo de Cobertura</h2>';
  if (coverage) {
    summary += `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;">
      <tr><th>Métrica</th><th>Percentual</th></tr>
      <tr><td>Statements</td><td>${coverage.statements}%</td></tr>
      <tr><td>Branches</td><td>${coverage.branches}%</td></tr>
      <tr><td>Functions</td><td>${coverage.functions}%</td></tr>
      <tr><td>Lines</td><td>${coverage.lines}%</td></tr>
    </table><br/>`;
  } else {
    summary += '<p>Relatório de cobertura não disponível.</p>';
  }

  const html = reportHtml || getReportHtml() || '<p>Relatório HTML não disponível.</p>';
  return summary + '<hr/>' + html;
}

export async function saveTestReport(reportHtml?: string) {
  try {
    const { getPrisma } = await import('./prisma.js');
    const prisma = await getPrisma();

    const html = reportHtml || getReportHtml();
    if (html) {
      await prisma.test.create({ data: { reportHtml: html } });
      console.log('✅ Relatório de testes salvo na tabela "tests".');
    } else {
      console.warn('⚠️ Nenhum relatório HTML encontrado para salvar.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erro ao salvar relatório no banco:', error instanceof Error ? error.message : error);
  }
}

export async function sendTestReportEmail(to: string, reportHtml?: string) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    console.warn('⚠️ SMTP_USER/SMTP_PASS não configurados. Email não enviado.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const htmlContent = buildEmailHtml(reportHtml);

    await transporter.sendMail({
      from: `"Testes ACBr" <${user}>`,
      to,
      subject: `Relatório de Testes ACBr - ${new Date().toLocaleString('pt-BR')}`,
      html: htmlContent,
    });

    console.log(`✅ Email enviado para ${to}`);
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error instanceof Error ? error.message : error);
  }
}
