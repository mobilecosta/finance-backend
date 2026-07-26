import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY || '';
const lcovHtmlPath = path.join(process.cwd(), 'coverage', 'lcov-report', 'index.html');
const jestHtmlPath = path.join(process.cwd(), 'coverage', 'report.html');

function findReportHtml(): string | null {
  // 1. Istanbul HTML (lcov-report) — HTML mais completo com código fonte
  if (fs.existsSync(lcovHtmlPath)) {
    console.log('Usando relatório LCOV HTML:', lcovHtmlPath);
    return fs.readFileSync(lcovHtmlPath, 'utf8');
  }
  // 2. jest-html-reporters — relatório dos testes executados
  if (fs.existsSync(jestHtmlPath)) {
    console.log('Usando relatório jest-html-reporters:', jestHtmlPath);
    return fs.readFileSync(jestHtmlPath, 'utf8');
  }
  return null;
}

async function saveCoverageReport() {
  try {
    if (!fs.existsSync(lcovHtmlPath)) {
      console.log('Relatório LCOV HTML não encontrado em', lcovHtmlPath);
      console.log('Build Vercel — pulando execução do Jest (testes rodam via API /api/acbr-tests/run)');
    }

    const reportHtml = findReportHtml();

    if (!reportHtml) {
      console.error('Erro: Nenhum relatório HTML encontrado em', lcovHtmlPath, 'ou', jestHtmlPath);
      return;
    }

    if (supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const bucket = 'coverage-reports';
        const fileName = 'latest.html';

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, reportHtml, { contentType: 'text/html', upsert: true });

        if (uploadError) {
          console.warn('Aviso: não foi possível salvar no Storage:', uploadError.message);
        } else {
          const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
          console.log('Relatório enviado para Storage:', publicUrl);
        }
      } catch (storageError) {
        console.warn('Aviso: erro ao acessar Storage Supabase — continuando build.');
      }
    } else {
      console.log('SUPABASE_SERVICE_ROLE não configurado — pulando Storage.');
    }

    const { PrismaClient } = await import('@prisma/client') as any;
    const dbUrl = process.env.DATABASE_URL || '';
    const pgbouncerUrl = dbUrl.includes('pooler.supabase.com') && !dbUrl.includes('pgbouncer=true')
      ? dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true'
      : dbUrl;

    const prisma = new PrismaClient({ datasources: { db: { url: pgbouncerUrl } } });
    await prisma.test.create({ data: { reportHtml } });
    await prisma.$disconnect();

    console.log('Relatório salvo no banco de dados com sucesso.');
  } catch (error) {
    console.error('Erro ao salvar o relatório:', error);
    process.exit(1);
  }
}

await saveCoverageReport();
