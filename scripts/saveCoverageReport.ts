import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY || '';
const reportHtmlPath = path.join(process.cwd(), 'coverage', 'report.html');

async function saveCoverageReport() {
  try {
    if (!fs.existsSync(reportHtmlPath)) {
      console.log('Relatório não encontrado em', reportHtmlPath);
      console.log('Tentando gerar com Jest...');
      const jestBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'jest');
      execSync(`"${jestBin}" --coverage --no-cache`, {
        stdio: 'inherit',
        timeout: 180000,
        env: { ...process.env, NODE_ENV: 'test', NODE_OPTIONS: '--experimental-vm-modules' },
      });
    }

    if (!fs.existsSync(reportHtmlPath)) {
      console.error('Erro: Relatório não foi gerado em', reportHtmlPath);
      return;
    }

    const reportHtml = fs.readFileSync(reportHtmlPath, 'utf8');

    if (supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const bucket = 'coverage-reports';
      const fileName = 'latest.html';

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, reportHtml, { contentType: 'text/html', upsert: true });

      if (uploadError) {
        console.error('Erro ao fazer upload para Storage:', uploadError);
      } else {
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
        console.log('Relatório enviado para Storage:', publicUrl);
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
